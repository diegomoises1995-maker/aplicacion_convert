"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { alcanceIncluye } from "@/lib/alcance";
import { getAlcance, requirePermiso, requireUsuario } from "@/server/sesion";
import { registrarAuditoria } from "@/server/auditoria";
import { ejecutarTareasDiarias, type ResultadoTareas } from "@/server/tareas-diarias";

export async function marcarAlertaAtendida(id: string): Promise<{ error?: string }> {
  const usuario = await requireUsuario();
  const a = await db.alertaRecompra.findUnique({ where: { id }, include: { cliente: { select: { vendedorId: true } } } });
  if (!a || !alcanceIncluye(await getAlcance(usuario), a.cliente.vendedorId ?? a.vendedorId)) return { error: "Alerta no encontrada." };
  await db.alertaRecompra.update({ where: { id }, data: { atendida: true, atendidaAt: new Date() } });
  revalidatePath("/agenda");
  revalidatePath("/");
  return {};
}

export async function ejecutarTareasAhora(): Promise<{ error?: string; resultado?: ResultadoTareas }> {
  const admin = await requirePermiso("configuracion.editar");
  const resultado = await ejecutarTareasDiarias(db);
  await registrarAuditoria({ usuarioId: admin.id, accion: "sistema.tareas_manual", entidad: "Sistema", despues: resultado });
  revalidatePath("/", "layout");
  return { resultado };
}
