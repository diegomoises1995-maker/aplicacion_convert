"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { datosForm, erroresDeZod, type EstadoForm } from "@/lib/form";
import { requirePermiso } from "@/server/sesion";
import { registrarAuditoria } from "@/server/auditoria";

const n = (min: number, max: number) => z.coerce.number({ message: "Número inválido" }).min(min, `Mínimo ${min}`).max(max, `Máximo ${max}`);

const configSchema = z
  .object({
    igvPorcentaje: n(0, 50),
    pedidoMinimoSeries: n(0, 1000).int(),
    pedidoMinimoMonto: n(0, 1_000_000),
    pedidoMinimoCualquiera: z.string().optional().transform((v) => v === "on"),
    descuentoMaxVendedor: n(0, 100),
    descuentoMaxSupervisor: n(0, 100),
    diasClienteNuevo: n(1, 3650).int(),
    factorEnRiesgo: n(1, 10),
    diasClienteInactivo: n(1, 3650).int(),
    frecuenciaDefectoDias: n(1, 365).int(),
    semaforoVerde: n(1, 200).int(),
    semaforoAmarillo: n(0, 200).int(),
    umbralCategoriaA: n(0, 100_000_000),
    umbralCategoriaB: n(0, 100_000_000),
  })
  .refine((d) => d.descuentoMaxSupervisor >= d.descuentoMaxVendedor, {
    path: ["descuentoMaxSupervisor"], message: "Debe ser mayor o igual al del vendedor",
  })
  .refine((d) => d.semaforoVerde > d.semaforoAmarillo, { path: ["semaforoVerde"], message: "Debe ser mayor que el umbral amarillo" })
  .refine((d) => d.umbralCategoriaA > d.umbralCategoriaB, { path: ["umbralCategoriaA"], message: "Debe ser mayor que el de B" });

export async function guardarConfiguracion(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const admin = await requirePermiso("configuracion.editar");
  const parsed = configSchema.safeParse(datosForm(formData));
  if (!parsed.success) return { errores: erroresDeZod(parsed.error) };

  await db.$transaction(async (tx) => {
    const antes = await tx.configuracion.findUnique({ where: { id: 1 } });
    const despues = await tx.configuracion.upsert({ where: { id: 1 }, update: parsed.data, create: { id: 1, ...parsed.data } });
    await registrarAuditoria({ usuarioId: admin.id, accion: "configuracion.actualizar", entidad: "Configuracion", entidadId: "1", antes, despues }, tx);
  });
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Configuración guardada. Los estados de clientes se recalculan en el proceso diario." };
}

const zonaSchema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(60),
  descripcion: z.string().max(200).optional(),
});

export async function guardarZona(id: string | null, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const admin = await requirePermiso("zonas.gestionar");
  const parsed = zonaSchema.safeParse(datosForm(formData));
  if (!parsed.success) return { errores: erroresDeZod(parsed.error) };
  const existe = await db.zona.findFirst({ where: { nombre: { equals: parsed.data.nombre, mode: "insensitive" }, NOT: id ? { id } : undefined } });
  if (existe) return { errores: { nombre: "Ya existe una zona con ese nombre" } };

  const zona = id
    ? await db.zona.update({ where: { id }, data: parsed.data })
    : await db.zona.create({ data: parsed.data });
  await registrarAuditoria({ usuarioId: admin.id, accion: id ? "zona.actualizar" : "zona.crear", entidad: "Zona", entidadId: zona.id, despues: zona });
  revalidatePath("/configuracion/zonas");
  return { ok: true, mensaje: id ? "Zona actualizada." : "Zona creada." };
}

export async function alternarZona(id: string) {
  const admin = await requirePermiso("zonas.gestionar");
  const zona = await db.zona.findUniqueOrThrow({ where: { id } });
  await db.zona.update({ where: { id }, data: { activa: !zona.activa } });
  await registrarAuditoria({ usuarioId: admin.id, accion: "zona.estado", entidad: "Zona", entidadId: id, antes: { activa: zona.activa }, despues: { activa: !zona.activa } });
  revalidatePath("/configuracion/zonas");
}
