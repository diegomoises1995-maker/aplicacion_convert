"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { datosForm, erroresDeZod, type EstadoForm } from "@/lib/form";
import { desdeInputFecha } from "@/lib/fechas";
import { alcanceIncluye } from "@/lib/alcance";
import { ETAPAS, esCerrada, validarCambioEtapa, type Etapa } from "@/lib/pipeline";
import { getAlcance, requireUsuario } from "@/server/sesion";
import { puedeVerCliente } from "@/server/clientes";

const oportunidadSchema = z.object({
  titulo: z.string().min(3, "Ponle un título").max(150),
  clienteId: z.string({ message: "Elige un cliente" }),
  etapa: z.enum(ETAPAS as [Etapa, ...Etapa[]]).default("PROSPECTO"),
  valorEstimado: z.coerce.number({ message: "Monto inválido" }).min(0).max(10_000_000),
  paresEstimados: z.coerce.number().int().min(0).max(1_000_000).optional(),
  fechaCierreProbable: z.string().optional().transform((v) => (v ? desdeInputFecha(v) : null)),
  motivoPerdida: z.string().max(200).optional(),
  notas: z.string().max(2000).optional(),
});

export async function guardarOportunidad(id: string | null, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const usuario = await requireUsuario();
  const parsed = oportunidadSchema.safeParse(datosForm(formData));
  if (!parsed.success) return { errores: erroresDeZod(parsed.error) };
  const d = parsed.data;
  const errorEtapa = validarCambioEtapa(d.etapa, d.motivoPerdida);
  if (errorEtapa) return { errores: { motivoPerdida: errorEtapa } };

  const cliente = await db.cliente.findUnique({ where: { id: d.clienteId }, select: { vendedorId: true } });
  if (!cliente || !(await puedeVerCliente(usuario, cliente))) return { errores: { clienteId: "Cliente no encontrado" } };

  const datos = {
    titulo: d.titulo,
    clienteId: d.clienteId,
    etapa: d.etapa,
    valorEstimado: d.valorEstimado,
    paresEstimados: d.paresEstimados ?? null,
    fechaCierreProbable: d.fechaCierreProbable,
    motivoPerdida: d.etapa === "PERDIDO" ? d.motivoPerdida : null,
    fechaCierreReal: esCerrada(d.etapa) ? new Date() : null,
    notas: d.notas ?? null,
  };

  let opId = id;
  if (id) {
    const actual = await db.oportunidad.findUnique({ where: { id } });
    if (!actual || !alcanceIncluye(await getAlcance(usuario), actual.vendedorId)) return { error: "Oportunidad no encontrada." };
    await db.oportunidad.update({
      where: { id },
      data: { ...datos, fechaCierreReal: esCerrada(d.etapa) ? (actual.fechaCierreReal ?? new Date()) : null },
    });
  } else {
    // La oportunidad es del vendedor del cliente (o de quien la crea si no tiene)
    const vendedorId = usuario.rol === "VENDEDOR" ? usuario.id : (cliente.vendedorId ?? usuario.id);
    const creada = await db.oportunidad.create({ data: { ...datos, vendedorId } });
    opId = creada.id;
  }
  revalidatePath("/pipeline");
  revalidatePath(`/clientes/${d.clienteId}`);
  redirect(`/pipeline/${opId}`);
}

export async function moverOportunidad(id: string, etapa: Etapa, motivoPerdida?: string): Promise<{ error?: string }> {
  const usuario = await requireUsuario();
  if (!ETAPAS.includes(etapa)) return { error: "Etapa inválida" };
  const error = validarCambioEtapa(etapa, motivoPerdida);
  if (error) return { error };

  const op = await db.oportunidad.findUnique({ where: { id } });
  if (!op || !alcanceIncluye(await getAlcance(usuario), op.vendedorId)) return { error: "Oportunidad no encontrada" };

  await db.oportunidad.update({
    where: { id },
    data: {
      etapa,
      motivoPerdida: etapa === "PERDIDO" ? motivoPerdida!.trim() : null,
      fechaCierreReal: esCerrada(etapa) ? (op.fechaCierreReal ?? new Date()) : null,
    },
  });
  revalidatePath("/pipeline");
  revalidatePath(`/clientes/${op.clienteId}`);
  return {};
}
