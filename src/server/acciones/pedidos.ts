"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { datosForm, erroresDeZod, type EstadoForm } from "@/lib/form";
import { alcanceIncluye } from "@/lib/alcance";
import { tienePermiso } from "@/lib/permisos";
import { desdeInputFecha } from "@/lib/fechas";
import { descuentaStock, puedeTransicionar, NOMBRE_ESTADO_PEDIDO, type EstadoPedido } from "@/lib/pedidos";
import { claveVariante, faltantes, necesidadPorVariante, type Distribucion } from "@/lib/stock";
import { redondear } from "@/lib/ventas";
import { getAlcance, requireUsuario, type UsuarioActual } from "@/server/sesion";
import { registrarAuditoria } from "@/server/auditoria";
import { recalcularMetricasCliente } from "@/server/metricas-cliente";

async function pedidoVisible(usuario: UsuarioActual, id: string) {
  const pedido = await db.pedido.findUnique({ where: { id }, include: { pagos: true } });
  if (!pedido || !alcanceIncluye(await getAlcance(usuario), pedido.vendedorId)) return null;
  return pedido;
}

function revalidar(id: string, clienteId: string) {
  revalidatePath(`/pedidos/${id}`);
  revalidatePath("/pedidos");
  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/");
}

const pagoSchema = z.object({
  monto: z.coerce.number({ message: "Monto inválido" }).positive("Debe ser mayor que 0").max(10_000_000),
  metodo: z.enum(["TRANSFERENCIA", "DEPOSITO", "YAPE", "PLIN", "EFECTIVO", "OTRO"]),
  referencia: z.string().max(100).optional(),
  fecha: z.string().optional().transform((v) => (v ? desdeInputFecha(v) : new Date())),
});

export async function registrarPago(pedidoId: string, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const usuario = await requireUsuario();
  const pedido = await pedidoVisible(usuario, pedidoId);
  if (!pedido) return { error: "Pedido no encontrado." };
  if (pedido.estado === "CANCELADO") return { error: "El pedido está cancelado." };
  const parsed = pagoSchema.safeParse(datosForm(formData));
  if (!parsed.success) return { errores: erroresDeZod(parsed.error) };
  if (!parsed.data.fecha) return { errores: { fecha: "Fecha inválida" } };

  const verificador = tienePermiso(usuario.rol, "pagos.verificar");
  const pago = await db.pago.create({
    data: {
      pedidoId,
      monto: parsed.data.monto,
      metodo: parsed.data.metodo,
      referencia: parsed.data.referencia ?? null,
      fecha: parsed.data.fecha,
      // Si lo registra quien verifica pagos, queda verificado de inmediato.
      verificado: verificador,
      verificadoPorId: verificador ? usuario.id : null,
      verificadoAt: verificador ? new Date() : null,
    },
  });
  await registrarAuditoria({ usuarioId: usuario.id, accion: "pago.registrar", entidad: "Pedido", entidadId: pedidoId, despues: pago });
  revalidar(pedidoId, pedido.clienteId);
  return { ok: true, mensaje: verificador ? "Pago registrado y verificado." : "Pago registrado. Queda pendiente de verificación." };
}

export async function verificarPago(pagoId: string): Promise<{ error?: string }> {
  const usuario = await requireUsuario();
  if (!tienePermiso(usuario.rol, "pagos.verificar")) return { error: "No puedes verificar pagos." };
  const pago = await db.pago.findUnique({ where: { id: pagoId }, include: { pedido: true } });
  if (!pago || pago.verificado) return { error: "Pago no encontrado o ya verificado." };
  await db.pago.update({ where: { id: pagoId }, data: { verificado: true, verificadoPorId: usuario.id, verificadoAt: new Date() } });
  await registrarAuditoria({ usuarioId: usuario.id, accion: "pago.verificar", entidad: "Pedido", entidadId: pago.pedidoId, despues: { pagoId, monto: pago.monto } });
  revalidar(pago.pedidoId, pago.pedido.clienteId);
  return {};
}

const cambioSchema = z.object({
  estado: z.enum(["PAGO_VERIFICADO", "EN_PREPARACION", "ENVIADO", "ENTREGADO", "CANCELADO"]),
  agenciaEnvio: z.string().max(60).optional(),
  numeroGuia: z.string().max(60).optional(),
  comprobante: z.string().max(40).optional(),
  comentario: z.string().max(500).optional(),
});

export async function cambiarEstadoPedido(pedidoId: string, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const usuario = await requireUsuario();
  const pedido = await pedidoVisible(usuario, pedidoId);
  if (!pedido) return { error: "Pedido no encontrado." };
  const parsed = cambioSchema.safeParse(datosForm(formData));
  if (!parsed.success) return { errores: erroresDeZod(parsed.error) };
  const d = parsed.data;
  const desde = pedido.estado as EstadoPedido;
  const hacia = d.estado as EstadoPedido;
  if (!puedeTransicionar(desde, hacia)) return { error: `No se puede pasar de «${NOMBRE_ESTADO_PEDIDO[desde]}» a «${NOMBRE_ESTADO_PEDIDO[hacia]}».` };

  // Permisos por transición
  if (hacia === "PAGO_VERIFICADO" && !tienePermiso(usuario.rol, "pagos.verificar")) return { error: "Solo el gerente verifica pagos." };
  if (["EN_PREPARACION", "ENVIADO", "ENTREGADO"].includes(hacia) && !tienePermiso(usuario.rol, "pedidos.gestionar")) {
    return { error: "No tienes permiso para gestionar despachos." };
  }
  if (hacia === "CANCELADO") {
    if (desde !== "PENDIENTE_PAGO" && !tienePermiso(usuario.rol, "pedidos.gestionar")) return { error: "Solo el gerente cancela pedidos ya pagados." };
    if (!d.comentario) return { errores: { comentario: "Indica el motivo de la cancelación" } };
  }
  if (hacia === "ENVIADO" && (!d.agenciaEnvio || !d.numeroGuia)) {
    return { errores: { ...(d.agenciaEnvio ? {} : { agenciaEnvio: "Elige la agencia" }), ...(d.numeroGuia ? {} : { numeroGuia: "Ingresa el número de guía" }) } };
  }
  if (hacia === "PAGO_VERIFICADO") {
    const pagado = pedido.pagos.filter((p) => p.verificado).reduce((s, p) => s + Number(p.monto), 0);
    const falta = redondear(Number(pedido.total) - pagado);
    if (falta > 0.01) return { error: `Faltan S/ ${falta.toFixed(2)} en pagos verificados para confirmar el pedido.` };
  }

  const items = await db.itemPedido.findMany({ where: { pedidoId }, include: { modelo: { include: { curva: true } } } });
  const necesidad = necesidadPorVariante(
    items.map((i) => ({ modeloId: i.modeloId, colorId: i.colorId, series: i.series, distribucion: i.modelo.curva.distribucion as Distribucion })),
  );
  const descontar = !descuentaStock(desde) && descuentaStock(hacia);
  const devolver = descuentaStock(desde) && hacia === "CANCELADO";

  try {
    await db.$transaction(async (tx) => {
      if (descontar || devolver) {
        const variantes = await tx.variante.findMany({
          where: { modeloId: { in: items.map((i) => i.modeloId) } },
          include: { color: true, modelo: { select: { nombre: true } } },
        });
        const porClave = new Map(variantes.map((v) => [claveVariante(v.modeloId, v.colorId, v.talla), v]));
        if (descontar) {
          const stock = new Map(variantes.map((v) => [claveVariante(v.modeloId, v.colorId, v.talla), v.stock]));
          const falt = faltantes(necesidad, stock);
          if (falt.length) {
            const detalle = falt.slice(0, 4).map((f) => {
              const v = porClave.get(f.clave);
              return v ? `${v.modelo.nombre} ${v.color.nombre} T${v.talla} (hay ${f.disponible}, se necesitan ${f.necesario})` : f.clave;
            });
            throw new Error(`STOCK:Stock insuficiente: ${detalle.join("; ")}`);
          }
        }
        for (const [clave, pares] of necesidad) {
          const v = porClave.get(clave);
          if (!v) continue;
          // Decremento condicionado: evita stock negativo si dos pedidos se confirman a la vez.
          const r = await tx.variante.updateMany({
            where: { id: v.id, ...(descontar ? { stock: { gte: pares } } : {}) },
            data: { stock: descontar ? { decrement: pares } : { increment: pares } },
          });
          if (r.count === 0) throw new Error(`STOCK:Stock insuficiente en ${v.modelo.nombre} ${v.color.nombre} T${v.talla}`);
        }
      }
      await tx.pedido.update({
        where: { id: pedidoId },
        data: {
          estado: hacia,
          ...(hacia === "ENVIADO" ? { agenciaEnvio: d.agenciaEnvio, numeroGuia: d.numeroGuia, fechaEnvio: new Date() } : {}),
          ...(hacia === "ENTREGADO" ? { fechaEntrega: new Date() } : {}),
          ...(hacia === "CANCELADO" ? { motivoCancelacion: d.comentario } : {}),
          ...(d.comprobante ? { comprobante: d.comprobante } : {}),
        },
      });
      await tx.pedidoEstadoHistorial.create({
        data: { pedidoId, estadoAnterior: desde, estadoNuevo: hacia, usuarioId: usuario.id, comentario: d.comentario ?? null },
      });
      await registrarAuditoria(
        {
          usuarioId: usuario.id, accion: `pedido.${hacia.toLowerCase()}`, entidad: "Pedido", entidadId: pedidoId,
          antes: { estado: desde }, despues: { estado: hacia, stock: descontar ? "descontado" : devolver ? "devuelto" : "sin cambios", comentario: d.comentario },
        },
        tx,
      );
      await recalcularMetricasCliente(pedido.clienteId, { tx });
    });
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("STOCK:")) return { error: e.message.slice(6) };
    throw e;
  }

  revalidar(pedidoId, pedido.clienteId);
  revalidatePath("/catalogo");
  return { ok: true, mensaje: `Pedido actualizado a «${NOMBRE_ESTADO_PEDIDO[hacia]}».` };
}
