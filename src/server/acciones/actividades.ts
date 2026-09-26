"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { datosForm, erroresDeZod, type EstadoForm } from "@/lib/form";
import { desdeInputFecha } from "@/lib/fechas";
import { alcanceIncluye } from "@/lib/alcance";
import { getAlcance, requireUsuario, type UsuarioActual } from "@/server/sesion";
import { puedeVerCliente } from "@/server/clientes";

const TIPOS = ["LLAMADA", "WHATSAPP", "VISITA", "REUNION", "EMAIL", "TAREA"] as const;
const RESULTADOS = ["PENDIENTE", "EXITOSA", "SIN_RESPUESTA", "REPROGRAMADA", "NO_INTERESADO"] as const;
const fecha = (msg: string) =>
  z.string().transform((v, ctx) => {
    const f = desdeInputFecha(v);
    if (!f) {
      ctx.addIssue({ code: "custom", message: msg });
      return z.NEVER;
    }
    return f;
  });

const actividadSchema = z.object({
  tipo: z.enum(TIPOS),
  asunto: z.string().min(2, "Describe brevemente la actividad").max(150),
  descripcion: z.string().max(2000).optional(),
  clienteId: z.string().optional(),
  oportunidadId: z.string().optional(),
  vendedorId: z.string().optional(),
  realizada: z.string().optional().transform((v) => v === "on"),
  fecha: fecha("Fecha inválida"),
  resultado: z.enum(RESULTADOS).optional(),
  proximaAccion: z.string().max(150).optional(),
  proximaAccionFecha: fecha("Fecha inválida").optional(),
});

async function validarRelaciones(usuario: UsuarioActual, clienteId?: string, oportunidadId?: string) {
  if (clienteId) {
    const c = await db.cliente.findUnique({ where: { id: clienteId }, select: { vendedorId: true } });
    if (!c || !(await puedeVerCliente(usuario, c))) return "Cliente no encontrado";
  }
  if (oportunidadId) {
    const o = await db.oportunidad.findUnique({ where: { id: oportunidadId }, select: { vendedorId: true, clienteId: true } });
    if (!o || !alcanceIncluye(await getAlcance(usuario), o.vendedorId)) return "Oportunidad no encontrada";
    if (clienteId && o.clienteId !== clienteId) return "La oportunidad no corresponde al cliente";
  }
  return null;
}

function revalidar(clienteId?: string | null) {
  revalidatePath("/agenda");
  revalidatePath("/");
  if (clienteId) revalidatePath(`/clientes/${clienteId}`);
}

export async function crearActividad(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const usuario = await requireUsuario();
  const parsed = actividadSchema.safeParse(datosForm(formData));
  if (!parsed.success) return { errores: erroresDeZod(parsed.error) };
  const d = parsed.data;

  const error = await validarRelaciones(usuario, d.clienteId, d.oportunidadId);
  if (error) return { error };
  // Supervisores y gerente pueden asignar tareas a vendedores de su alcance.
  const vendedorId = d.vendedorId && usuario.rol !== "VENDEDOR" ? d.vendedorId : usuario.id;
  if (!alcanceIncluye(await getAlcance(usuario), vendedorId)) return { errores: { vendedorId: "Vendedor fuera de tu equipo" } };
  if (d.proximaAccion && !d.proximaAccionFecha) return { errores: { proximaAccionFecha: "Indica cuándo" } };

  await db.$transaction(async (tx) => {
    await tx.actividad.create({
      data: {
        tipo: d.tipo,
        asunto: d.asunto,
        descripcion: d.descripcion,
        clienteId: d.clienteId,
        oportunidadId: d.oportunidadId,
        vendedorId,
        fechaProgramada: d.fecha,
        completada: d.realizada,
        fechaRealizada: d.realizada ? d.fecha : null,
        resultado: d.realizada ? (d.resultado ?? "EXITOSA") : "PENDIENTE",
        proximaAccion: d.proximaAccion,
        proximaAccionFecha: d.proximaAccionFecha,
      },
    });
    if (d.realizada && d.proximaAccion && d.proximaAccionFecha) {
      await tx.actividad.create({
        data: {
          tipo: "TAREA", asunto: d.proximaAccion, clienteId: d.clienteId, oportunidadId: d.oportunidadId,
          vendedorId, fechaProgramada: d.proximaAccionFecha,
        },
      });
    }
  });
  revalidar(d.clienteId);
  return { ok: true, mensaje: d.realizada ? "Actividad registrada." : "Actividad programada." };
}

const completarSchema = z.object({
  resultado: z.enum(RESULTADOS).refine((r) => r !== "PENDIENTE", "Elige un resultado"),
  notas: z.string().max(2000).optional(),
  proximaAccion: z.string().max(150).optional(),
  proximaAccionFecha: fecha("Fecha inválida").optional(),
  proximaTipo: z.enum(TIPOS).optional(),
});

export async function completarActividad(id: string, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const usuario = await requireUsuario();
  const parsed = completarSchema.safeParse(datosForm(formData));
  if (!parsed.success) return { errores: erroresDeZod(parsed.error) };
  const d = parsed.data;
  if (d.proximaAccion && !d.proximaAccionFecha) return { errores: { proximaAccionFecha: "Indica cuándo" } };

  const act = await db.actividad.findUnique({ where: { id } });
  if (!act || !alcanceIncluye(await getAlcance(usuario), act.vendedorId)) return { error: "Actividad no encontrada." };
  if (act.completada) return { error: "La actividad ya estaba completada." };

  await db.$transaction(async (tx) => {
    await tx.actividad.update({
      where: { id },
      data: {
        completada: true,
        fechaRealizada: new Date(),
        resultado: d.resultado,
        descripcion: [act.descripcion, d.notas].filter(Boolean).join("\n") || null,
        proximaAccion: d.proximaAccion,
        proximaAccionFecha: d.proximaAccionFecha,
      },
    });
    if (d.proximaAccion && d.proximaAccionFecha) {
      await tx.actividad.create({
        data: {
          tipo: d.proximaTipo ?? "TAREA", asunto: d.proximaAccion, clienteId: act.clienteId,
          oportunidadId: act.oportunidadId, vendedorId: act.vendedorId, fechaProgramada: d.proximaAccionFecha,
        },
      });
    }
  });
  revalidar(act.clienteId);
  return { ok: true, mensaje: "Actividad completada." };
}

/** Se llama al abrir WhatsApp desde la app: deja constancia del contacto. */
export async function registrarWhatsApp(clienteId: string, plantilla: string | null) {
  const usuario = await requireUsuario();
  const c = await db.cliente.findUnique({ where: { id: clienteId }, select: { vendedorId: true } });
  if (!c || !(await puedeVerCliente(usuario, c))) return;
  const ahora = new Date();
  await db.actividad.create({
    data: {
      tipo: "WHATSAPP",
      asunto: plantilla ? `WhatsApp: ${plantilla}` : "Mensaje de WhatsApp",
      clienteId,
      vendedorId: usuario.id,
      fechaProgramada: ahora,
      fechaRealizada: ahora,
      completada: true,
      resultado: "EXITOSA",
    },
  });
  revalidar(clienteId);
}
