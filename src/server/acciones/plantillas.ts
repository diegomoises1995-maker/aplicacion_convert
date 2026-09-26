"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { datosForm, erroresDeZod, type EstadoForm } from "@/lib/form";
import { requirePermiso } from "@/server/sesion";

const schema = z.object({
  nombre: z.string().min(2, "Ponle un nombre").max(60),
  mensaje: z.string().min(5, "Escribe el mensaje").max(1000),
});

export async function guardarPlantilla(id: string | null, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await requirePermiso("configuracion.editar");
  const parsed = schema.safeParse(datosForm(formData));
  if (!parsed.success) return { errores: erroresDeZod(parsed.error) };
  if (id) await db.plantillaWhatsApp.update({ where: { id }, data: parsed.data });
  else await db.plantillaWhatsApp.create({ data: parsed.data });
  revalidatePath("/configuracion/plantillas");
  return { ok: true, mensaje: "Plantilla guardada." };
}

export async function alternarPlantilla(id: string) {
  await requirePermiso("configuracion.editar");
  const p = await db.plantillaWhatsApp.findUniqueOrThrow({ where: { id } });
  await db.plantillaWhatsApp.update({ where: { id }, data: { activa: !p.activa } });
  revalidatePath("/configuracion/plantillas");
}
