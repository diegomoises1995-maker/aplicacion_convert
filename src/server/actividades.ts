import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { ActividadVista } from "@/components/seguimiento/item-actividad";

export async function listarActividades(
  where: Prisma.ActividadWhereInput,
  opciones: { orden?: "asc" | "desc"; take?: number; conVendedor?: boolean } = {},
): Promise<ActividadVista[]> {
  const filas = await db.actividad.findMany({
    where,
    include: {
      cliente: { select: { id: true, razonSocial: true, nombreComercial: true, telefono: true } },
      vendedor: { select: { nombre: true } },
    },
    orderBy: { fechaProgramada: opciones.orden ?? "asc" },
    take: opciones.take,
  });
  return filas.map((a) => ({
    id: a.id,
    tipo: a.tipo,
    asunto: a.asunto,
    descripcion: a.descripcion,
    resultado: a.resultado,
    fechaProgramada: a.fechaProgramada,
    fechaRealizada: a.fechaRealizada,
    completada: a.completada,
    proximaAccion: a.proximaAccion,
    cliente: a.cliente ? { id: a.cliente.id, nombre: a.cliente.nombreComercial || a.cliente.razonSocial, telefono: a.cliente.telefono } : null,
    vendedor: opciones.conVendedor ? a.vendedor.nombre : null,
  }));
}
