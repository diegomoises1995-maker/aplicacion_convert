"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import type { EstadoForm } from "@/lib/form";
import { alcanceIncluye } from "@/lib/alcance";
import { aprobacionRequerida, calcularTotales, puedeAprobar, validarPedidoMinimo } from "@/lib/precios";
import { paresPorSerie, type Distribucion } from "@/lib/stock";
import { getAlcance, requireUsuario } from "@/server/sesion";
import { puedeVerCliente } from "@/server/clientes";
import { getConfiguracion } from "@/server/configuracion";
import { contextoPrecios } from "@/server/precios";
import { registrarAuditoria } from "@/server/auditoria";
import { tienePermiso } from "@/lib/permisos";

const cotizacionSchema = z.object({
  clienteId: z.string().min(1, "Elige un cliente"),
  oportunidadId: z.string().optional().nullable(),
  lineas: z
    .array(z.object({ modeloId: z.string(), colorId: z.string(), series: z.number().int().min(1).max(1000) }))
    .min(1, "Agrega al menos un modelo")
    .max(60),
  descuentoManual: z.number().min(0).max(90),
  validezDias: z.number().int().min(1).max(60).default(7),
  notas: z.string().max(2000).optional().nullable(),
});

export type EntradaCotizacion = z.infer<typeof cotizacionSchema>;

export async function crearCotizacion(entrada: EntradaCotizacion): Promise<{ error?: string } | never> {
  const usuario = await requireUsuario();
  const parsed = cotizacionSchema.safeParse(entrada);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const d = parsed.data;

  const cliente = await db.cliente.findUnique({ where: { id: d.clienteId } });
  if (!cliente || !(await puedeVerCliente(usuario, cliente))) return { error: "Cliente no encontrado." };
  if (d.oportunidadId) {
    const op = await db.oportunidad.findUnique({ where: { id: d.oportunidadId }, select: { clienteId: true } });
    if (!op || op.clienteId !== cliente.id) return { error: "La oportunidad no corresponde al cliente." };
  }

  // Precios y existencias salen SIEMPRE de la base de datos, nunca del navegador.
  const modelos = await db.modelo.findMany({
    where: { id: { in: [...new Set(d.lineas.map((l) => l.modeloId))] }, activo: true },
    include: { curva: true, variantes: { select: { colorId: true } } },
  });
  const porId = new Map(modelos.map((m) => [m.id, m]));
  for (const l of d.lineas) {
    const m = porId.get(l.modeloId);
    if (!m) return { error: "Uno de los modelos ya no está disponible." };
    if (!m.variantes.some((v) => v.colorId === l.colorId)) return { error: `El color elegido no existe para ${m.nombre}.` };
  }

  const [config, precios] = await Promise.all([getConfiguracion(), contextoPrecios(cliente)]);
  const t = calcularTotales({
    lineas: d.lineas.map((l) => {
      const m = porId.get(l.modeloId)!;
      return {
        ...l,
        paresPorSerie: paresPorSerie(m.curva.distribucion as Distribucion),
        precioBase: Number(m.precioBase),
        precioLista: precios.preciosPorModelo[l.modeloId] ?? null,
      };
    }),
    ajusteLista: precios.lista?.ajuste ?? 0,
    escalas: precios.escalas,
    descuentoManual: d.descuentoManual,
    igvPorcentaje: config.igvPorcentaje,
  });
  const errorMinimo = validarPedidoMinimo(t.totalSeries, t.baseImponible, config);
  if (errorMinimo) return { error: errorMinimo };

  const aprobacion = aprobacionRequerida(usuario.rol, d.descuentoManual, config);
  const vendedorId = usuario.rol === "VENDEDOR" ? usuario.id : (cliente.vendedorId ?? usuario.id);

  const cot = await db.$transaction(async (tx) => {
    const c = await tx.cotizacion.create({
      data: {
        clienteId: cliente.id,
        vendedorId,
        oportunidadId: d.oportunidadId ?? null,
        estado: aprobacion ? "PENDIENTE_APROBACION" : "BORRADOR",
        validaHasta: new Date(Date.now() + d.validezDias * 86_400_000),
        subtotal: t.subtotal,
        descuentoVolumen: t.descuentoVolumen,
        descuentoPorcentaje: d.descuentoManual,
        descuentoMonto: t.descuentoManualMonto,
        baseImponible: t.baseImponible,
        igv: t.igv,
        total: t.total,
        notas: d.notas ?? null,
        items: {
          create: t.lineas.map((l) => ({
            modeloId: l.modeloId, colorId: l.colorId, series: l.series, pares: l.pares, precioPar: l.precioPar, subtotal: l.subtotal,
          })),
        },
      },
    });
    if (aprobacion) {
      await tx.aprobacionDescuento.create({
        data: { cotizacionId: c.id, solicitanteId: usuario.id, descuentoSolicitado: d.descuentoManual },
      });
    }
    if (d.descuentoManual > 0) {
      await registrarAuditoria(
        {
          usuarioId: usuario.id, accion: "descuento.aplicar", entidad: "Cotizacion", entidadId: c.id,
          despues: { numero: c.numero, descuento: d.descuentoManual, monto: t.descuentoManualMonto, requiereAprobacion: aprobacion },
        },
        tx,
      );
    }
    return c;
  });

  revalidatePath("/cotizaciones");
  redirect(`/cotizaciones/${cot.id}`);
}

async function cotizacionVisible(id: string) {
  const usuario = await requireUsuario();
  const cot = await db.cotizacion.findUnique({ where: { id }, include: { oportunidad: true } });
  if (!cot || !alcanceIncluye(await getAlcance(usuario), cot.vendedorId)) return { usuario, cot: null };
  return { usuario, cot };
}

export async function resolverAprobacion(aprobacionId: string, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const usuario = await requireUsuario();
  if (!tienePermiso(usuario.rol, "descuentos.aprobar")) return { error: "No puedes aprobar descuentos." };
  const aprobar = formData.get("decision") === "aprobar";
  const comentario = String(formData.get("comentario") ?? "").trim() || null;
  if (!aprobar && !comentario) return { errores: { comentario: "Indica el motivo del rechazo" } };

  const ap = await db.aprobacionDescuento.findUnique({ where: { id: aprobacionId }, include: { cotizacion: true } });
  if (!ap || ap.estado !== "PENDIENTE") return { error: "La solicitud ya fue resuelta." };
  if (!alcanceIncluye(await getAlcance(usuario), ap.cotizacion.vendedorId)) return { error: "Solicitud fuera de tu equipo." };
  const config = await getConfiguracion();
  if (aprobar && !puedeAprobar(usuario.rol, Number(ap.descuentoSolicitado), config)) {
    return { error: `Tu límite de aprobación es ${config.descuentoMaxSupervisor} %. Esta solicitud la aprueba el gerente.` };
  }

  await db.$transaction(async (tx) => {
    await tx.aprobacionDescuento.update({
      where: { id: ap.id },
      data: { estado: aprobar ? "APROBADA" : "RECHAZADA", aprobadorId: usuario.id, comentario, resueltaAt: new Date() },
    });
    await tx.cotizacion.update({ where: { id: ap.cotizacionId }, data: { estado: aprobar ? "BORRADOR" : "RECHAZADA" } });
    await registrarAuditoria(
      {
        usuarioId: usuario.id, accion: aprobar ? "descuento.aprobar" : "descuento.rechazar", entidad: "Cotizacion",
        entidadId: ap.cotizacionId, despues: { numero: ap.cotizacion.numero, descuento: ap.descuentoSolicitado, comentario },
      },
      tx,
    );
  });
  revalidatePath("/aprobaciones");
  revalidatePath(`/cotizaciones/${ap.cotizacionId}`);
  return { ok: true, mensaje: aprobar ? "Descuento aprobado." : "Descuento rechazado." };
}

const ETAPAS_PREVIAS = ["PROSPECTO", "CONTACTADO"] as const;

export async function cambiarEstadoCotizacion(id: string, estado: "ENVIADA" | "ACEPTADA" | "RECHAZADA"): Promise<{ error?: string }> {
  const { cot } = await cotizacionVisible(id);
  if (!cot) return { error: "Cotización no encontrada." };
  const permitidas: Record<string, string[]> = {
    BORRADOR: ["ENVIADA", "ACEPTADA", "RECHAZADA"],
    ENVIADA: ["ACEPTADA", "RECHAZADA"],
    ACEPTADA: ["RECHAZADA"],
  };
  if (!permitidas[cot.estado]?.includes(estado)) return { error: "Cambio de estado no permitido." };

  await db.$transaction(async (tx) => {
    await tx.cotizacion.update({ where: { id }, data: { estado } });
    if (cot.oportunidadId && cot.oportunidad) {
      if (estado === "ENVIADA" && (ETAPAS_PREVIAS as readonly string[]).includes(cot.oportunidad.etapa)) {
        await tx.oportunidad.update({ where: { id: cot.oportunidadId }, data: { etapa: "COTIZACION_ENVIADA", valorEstimado: cot.baseImponible } });
      }
      if (estado === "ACEPTADA" && cot.oportunidad.etapa !== "GANADO") {
        await tx.oportunidad.update({ where: { id: cot.oportunidadId }, data: { etapa: "NEGOCIACION" } });
      }
    }
  });
  revalidatePath(`/cotizaciones/${id}`);
  revalidatePath("/pipeline");
  return {};
}

const pedidoSchema = z.object({
  direccionEnvio: z.string().max(300).optional(),
  agenciaEnvio: z.string().max(60).optional(),
  notas: z.string().max(2000).optional(),
});

export async function convertirEnPedido(id: string, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { usuario, cot } = await cotizacionVisible(id);
  if (!cot) return { error: "Cotización no encontrada." };
  if (!["BORRADOR", "ENVIADA", "ACEPTADA"].includes(cot.estado)) {
    return { error: cot.estado === "PENDIENTE_APROBACION" ? "El descuento aún no está aprobado." : "Esta cotización no se puede convertir." };
  }
  if (cot.validaHasta && cot.validaHasta < new Date()) return { error: "La cotización venció. Duplícala para actualizar precios." };
  const d = pedidoSchema.parse(Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v).trim() || undefined])));

  const [config, items, cliente] = await Promise.all([
    getConfiguracion(),
    db.itemCotizacion.findMany({ where: { cotizacionId: id } }),
    db.cliente.findUniqueOrThrow({ where: { id: cot.clienteId } }),
  ]);
  const errorMinimo = validarPedidoMinimo(items.reduce((s, i) => s + i.series, 0), Number(cot.baseImponible), config);
  if (errorMinimo) return { error: errorMinimo };

  const pedido = await db.$transaction(async (tx) => {
    const p = await tx.pedido.create({
      data: {
        clienteId: cot.clienteId,
        vendedorId: cot.vendedorId,
        cotizacionId: cot.id,
        subtotal: Number(cot.subtotal),
        descuentoMonto: Number(cot.descuentoVolumen) + Number(cot.descuentoMonto),
        baseImponible: cot.baseImponible,
        igv: cot.igv,
        total: cot.total,
        totalSeries: items.reduce((s, i) => s + i.series, 0),
        totalPares: items.reduce((s, i) => s + i.pares, 0),
        direccionEnvio: d.direccionEnvio ?? [cliente.direccion, cliente.distrito, cliente.ciudad].filter(Boolean).join(", "),
        agenciaEnvio: d.agenciaEnvio ?? null,
        notas: d.notas ?? null,
        esPrimerPedido: cliente.numeroPedidos === 0,
        esReactivacion: cliente.estado === "INACTIVO",
        items: {
          create: items.map((i) => ({
            modeloId: i.modeloId, colorId: i.colorId, series: i.series, pares: i.pares, precioPar: i.precioPar, subtotal: i.subtotal,
          })),
        },
        historial: { create: { estadoNuevo: "PENDIENTE_PAGO", usuarioId: usuario.id, comentario: `Desde cotización #${cot.numero}` } },
      },
    });
    await tx.cotizacion.update({ where: { id }, data: { estado: "CONVERTIDA" } });
    if (cot.oportunidadId) {
      await tx.oportunidad.update({
        where: { id: cot.oportunidadId },
        data: { etapa: "GANADO", fechaCierreReal: new Date(), valorEstimado: cot.baseImponible },
      });
    }
    return p;
  });

  revalidatePath("/pedidos");
  revalidatePath("/pipeline");
  redirect(`/pedidos/${pedido.id}`);
}
