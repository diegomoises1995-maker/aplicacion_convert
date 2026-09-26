"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { datosForm, erroresDeZod, type EstadoForm } from "@/lib/form";
import { desdeInputFecha } from "@/lib/fechas";
import { requirePermiso } from "@/server/sesion";
import { registrarAuditoria } from "@/server/auditoria";
import { calcularComisionMes } from "@/server/indicadores";

const reglaSchema = z
  .object({
    nombre: z.string().min(3, "Ponle un nombre").max(80),
    tipo: z.enum(["PORCENTAJE_VENTA_COBRADA", "BONO_CUMPLIMIENTO_META", "BONO_CLIENTE_NUEVO", "BONO_CLIENTE_REACTIVADO"]),
    valor: z.coerce.number({ message: "Número inválido" }).positive("Debe ser mayor que 0").max(1_000_000),
    umbralCumplimiento: z.coerce.number().min(1).max(500).optional(),
    vigenteDesde: z.string().optional().transform((v) => (v ? desdeInputFecha(v) : null)),
  })
  .refine((d) => d.tipo !== "PORCENTAJE_VENTA_COBRADA" || d.valor <= 50, { path: ["valor"], message: "Máximo 50 %" })
  .refine((d) => d.tipo !== "BONO_CUMPLIMIENTO_META" || d.umbralCumplimiento, { path: ["umbralCumplimiento"], message: "Indica el % de cumplimiento" });

export async function crearRegla(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const admin = await requirePermiso("comisiones.configurar");
  const parsed = reglaSchema.safeParse(datosForm(formData));
  if (!parsed.success) return { errores: erroresDeZod(parsed.error) };
  const d = parsed.data;
  const r = await db.reglaComision.create({
    data: {
      nombre: d.nombre, tipo: d.tipo, valor: d.valor,
      umbralCumplimiento: d.tipo === "BONO_CUMPLIMIENTO_META" ? d.umbralCumplimiento : null,
      vigenteDesde: d.vigenteDesde ?? new Date(),
    },
  });
  await registrarAuditoria({ usuarioId: admin.id, accion: "comision.regla_crear", entidad: "ReglaComision", entidadId: r.id, despues: r });
  revalidatePath("/configuracion/comisiones");
  return { ok: true, mensaje: "Regla creada." };
}

/** Desactivar cierra la vigencia hoy: las liquidaciones pasadas no cambian. */
export async function alternarRegla(id: string) {
  const admin = await requirePermiso("comisiones.configurar");
  const r = await db.reglaComision.findUniqueOrThrow({ where: { id } });
  const despues = await db.reglaComision.update({
    where: { id },
    data: r.activa ? { activa: false, vigenteHasta: new Date() } : { activa: true, vigenteHasta: null },
  });
  await registrarAuditoria({ usuarioId: admin.id, accion: "comision.regla_estado", entidad: "ReglaComision", entidadId: id, antes: r, despues });
  revalidatePath("/configuracion/comisiones");
}

/** Calcula (o recalcula) las liquidaciones del mes; las aprobadas o pagadas no se tocan. */
export async function generarLiquidaciones(anio: number, mes: number): Promise<{ error?: string; generadas?: number }> {
  const admin = await requirePermiso("comisiones.liquidar");
  if (!(mes >= 1 && mes <= 12) || anio < 2020) return { error: "Período inválido." };
  const vendedores = await db.user.findMany({ where: { rol: { in: ["VENDEDOR", "SUPERVISOR"] }, OR: [{ activo: true }, { pedidos: { some: {} } }] }, select: { id: true } });
  let generadas = 0;
  for (const v of vendedores) {
    const existente = await db.liquidacionComision.findUnique({ where: { vendedorId_anio_mes: { vendedorId: v.id, anio, mes } } });
    if (existente && existente.estado !== "BORRADOR") continue;
    const c = await calcularComisionMes(v.id, anio, mes);
    if (c.total === 0 && c.resultados.ventaCobrada === 0 && !existente) continue;
    const datos = {
      ventaCobrada: c.resultados.ventaCobrada, comisionVenta: c.comisionVenta, bonos: c.bonos, total: c.total,
      detalle: JSON.parse(JSON.stringify({ resultados: c.resultados, lineas: c.lineas })),
    };
    await db.liquidacionComision.upsert({
      where: { vendedorId_anio_mes: { vendedorId: v.id, anio, mes } },
      update: datos,
      create: { vendedorId: v.id, anio, mes, ...datos },
    });
    generadas++;
  }
  await registrarAuditoria({ usuarioId: admin.id, accion: "comision.liquidar", entidad: "LiquidacionComision", despues: { anio, mes, generadas } });
  revalidatePath("/comisiones");
  return { generadas };
}

export async function cambiarEstadoLiquidacion(id: string, estado: "APROBADA" | "PAGADA" | "BORRADOR"): Promise<{ error?: string }> {
  const admin = await requirePermiso("comisiones.liquidar");
  const l = await db.liquidacionComision.findUnique({ where: { id } });
  if (!l) return { error: "Liquidación no encontrada." };
  const permitido = { BORRADOR: ["APROBADA"], APROBADA: ["PAGADA", "BORRADOR"], PAGADA: [] as string[] }[l.estado];
  if (!permitido.includes(estado)) return { error: "Cambio no permitido." };
  await db.liquidacionComision.update({ where: { id }, data: { estado } });
  await registrarAuditoria({ usuarioId: admin.id, accion: `comision.${estado.toLowerCase()}`, entidad: "LiquidacionComision", entidadId: id, antes: { estado: l.estado }, despues: { estado, total: l.total } });
  revalidatePath("/comisiones");
  return {};
}
