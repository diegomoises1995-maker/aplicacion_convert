"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { datosForm, erroresDeZod, type EstadoForm } from "@/lib/form";
import { requirePermiso } from "@/server/sesion";
import { registrarAuditoria } from "@/server/auditoria";

const listaSchema = z.object({
  nombre: z.string().min(2).max(60),
  tipoCliente: z.enum(["TIENDA", "REVENDEDOR", "DISTRIBUIDOR", "OTRO"]).optional(),
  ajustePorcentaje: z.coerce.number({ message: "Número inválido" }).min(-90).max(200),
  activa: z.string().optional().transform((v) => v === "on"),
});

export async function guardarLista(id: string | null, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const admin = await requirePermiso("precios.gestionar");
  const parsed = listaSchema.safeParse(datosForm(formData));
  if (!parsed.success) return { errores: erroresDeZod(parsed.error) };
  const d = { ...parsed.data, tipoCliente: parsed.data.tipoCliente ?? null, activa: id ? parsed.data.activa : true };
  const dup = await db.listaPrecio.findFirst({ where: { nombre: d.nombre, NOT: id ? { id } : undefined } });
  if (dup) return { errores: { nombre: "Ya existe una lista con ese nombre" } };
  if (d.tipoCliente && d.activa) {
    const otra = await db.listaPrecio.findFirst({ where: { tipoCliente: d.tipoCliente, activa: true, NOT: id ? { id } : undefined } });
    if (otra) return { errores: { tipoCliente: `La lista «${otra.nombre}» ya es la de ese tipo de cliente` } };
  }

  await db.$transaction(async (tx) => {
    const antes = id ? await tx.listaPrecio.findUnique({ where: { id } }) : null;
    const lista = id ? await tx.listaPrecio.update({ where: { id }, data: d }) : await tx.listaPrecio.create({ data: d });
    await registrarAuditoria({ usuarioId: admin.id, accion: id ? "lista_precio.actualizar" : "lista_precio.crear", entidad: "ListaPrecio", entidadId: lista.id, antes, despues: lista }, tx);
  });
  revalidatePath("/configuracion/precios");
  return { ok: true, mensaje: "Lista guardada." };
}

export async function guardarPrecioModelo(listaId: string, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const admin = await requirePermiso("precios.gestionar");
  const modeloId = String(formData.get("modeloId") ?? "");
  const raw = String(formData.get("precio") ?? "").trim();
  if (!modeloId) return { errores: { modeloId: "Elige un modelo" } };

  const antes = await db.precioLista.findUnique({ where: { listaId_modeloId: { listaId, modeloId } } });
  if (raw === "") {
    if (antes) await db.precioLista.delete({ where: { id: antes.id } });
    await registrarAuditoria({ usuarioId: admin.id, accion: "precio.lista_eliminar", entidad: "PrecioLista", entidadId: antes?.id, antes });
    revalidatePath("/configuracion/precios");
    return { ok: true, mensaje: "Precio específico eliminado; se usa el ajuste de la lista." };
  }
  const precio = Number(raw);
  if (!Number.isFinite(precio) || precio <= 0) return { errores: { precio: "Precio inválido" } };
  const p = await db.precioLista.upsert({
    where: { listaId_modeloId: { listaId, modeloId } },
    update: { precio },
    create: { listaId, modeloId, precio },
  });
  await registrarAuditoria({ usuarioId: admin.id, accion: "precio.lista_actualizar", entidad: "PrecioLista", entidadId: p.id, antes, despues: p });
  revalidatePath("/configuracion/precios");
  return { ok: true, mensaje: "Precio guardado." };
}

const escalaSchema = z.object({
  desdeSeries: z.coerce.number().int().min(1, "Mínimo 1").max(10_000),
  descuentoPorcentaje: z.coerce.number().min(0.01, "Mayor que 0").max(90),
});

export async function guardarEscala(listaId: string | null, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const admin = await requirePermiso("precios.gestionar");
  const parsed = escalaSchema.safeParse(datosForm(formData));
  if (!parsed.success) return { errores: erroresDeZod(parsed.error) };
  const existente = await db.escalaPrecio.findFirst({ where: { listaId, desdeSeries: parsed.data.desdeSeries } });
  const e = existente
    ? await db.escalaPrecio.update({ where: { id: existente.id }, data: parsed.data })
    : await db.escalaPrecio.create({ data: { ...parsed.data, listaId } });
  await registrarAuditoria({ usuarioId: admin.id, accion: "escala.guardar", entidad: "EscalaPrecio", entidadId: e.id, antes: existente, despues: e });
  revalidatePath("/configuracion/precios");
  return { ok: true, mensaje: "Escala guardada." };
}

export async function eliminarEscala(id: string) {
  const admin = await requirePermiso("precios.gestionar");
  const e = await db.escalaPrecio.delete({ where: { id } });
  await registrarAuditoria({ usuarioId: admin.id, accion: "escala.eliminar", entidad: "EscalaPrecio", entidadId: id, antes: e });
  revalidatePath("/configuracion/precios");
}
