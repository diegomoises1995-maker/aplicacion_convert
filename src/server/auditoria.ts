import "server-only";
import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type Cliente = Prisma.TransactionClient | typeof db;

export type EventoAuditoria = {
  usuarioId: string | null;
  accion: string; // ej. "cliente.reasignar"
  entidad: string; // ej. "Cliente"
  entidadId?: string | null;
  antes?: unknown;
  despues?: unknown;
};

// Serializa Decimal/Date a JSON plano.
function aJson(valor: unknown): Prisma.InputJsonValue | undefined {
  if (valor === undefined || valor === null) return undefined;
  return JSON.parse(JSON.stringify(valor));
}

async function ipCliente() {
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  } catch {
    return null; // fuera de un request (seed, cron)
  }
}

/** Registra un cambio importante. Pasar `tx` para que quede en la misma transacción. */
export async function registrarAuditoria(evento: EventoAuditoria, tx: Cliente = db) {
  await tx.auditLog.create({
    data: {
      usuarioId: evento.usuarioId,
      accion: evento.accion,
      entidad: evento.entidad,
      entidadId: evento.entidadId ?? null,
      antes: aJson(evento.antes),
      despues: aJson(evento.despues),
      ip: await ipCliente(),
    },
  });
}
