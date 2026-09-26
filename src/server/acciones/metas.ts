"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { EstadoForm } from "@/lib/form";
import { TIPOS_META, type TipoMeta } from "@/lib/metas";
import { mesAnterior } from "@/lib/fechas";
import { requirePermiso } from "@/server/sesion";
import { registrarAuditoria } from "@/server/auditoria";

type Destino = { periodo: "MENSUAL" | "TRIMESTRAL"; anio: number; mes: number | null; trimestre: number | null };

function validarDestino(d: Destino) {
  if (!Number.isInteger(d.anio) || d.anio < 2020 || d.anio > 2100) return false;
  if (d.periodo === "MENSUAL") return Number.isInteger(d.mes) && d.mes! >= 1 && d.mes! <= 12;
  return Number.isInteger(d.trimestre) && d.trimestre! >= 1 && d.trimestre! <= 4;
}

/**
 * Campos del formulario: meta__{ambito}__{id}__{tipo}
 * ambito = v (vendedor), e (equipo de un supervisor) o x (empresa, id "-").
 */
export async function guardarMetas(destino: Destino, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const admin = await requirePermiso("metas.definir");
  if (!validarDestino(destino)) return { error: "Período inválido." };
  const base = {
    periodo: destino.periodo, anio: destino.anio,
    mes: destino.periodo === "MENSUAL" ? destino.mes : null,
    trimestre: destino.periodo === "TRIMESTRAL" ? destino.trimestre : null,
  };

  const cambios: unknown[] = [];
  const errores: Record<string, string> = {};
  const entradas: { ambito: string; id: string; tipo: TipoMeta; valor: number | null; campo: string }[] = [];
  for (const [campo, raw] of formData.entries()) {
    const m = /^meta__(v|e|x)__([^_]+|-)__([A-Z_]+)$/.exec(campo);
    if (!m || !TIPOS_META.includes(m[3] as TipoMeta)) continue;
    const texto = String(raw).trim();
    const valor = texto === "" ? null : Number(texto);
    if (valor !== null && (!Number.isFinite(valor) || valor < 0 || valor > 100_000_000)) {
      errores[campo] = "Valor inválido";
      continue;
    }
    entradas.push({ ambito: m[1]!, id: m[2]!, tipo: m[3] as TipoMeta, valor, campo });
  }
  if (Object.keys(errores).length) return { errores, error: "Hay valores inválidos." };

  await db.$transaction(async (tx) => {
    for (const e of entradas) {
      const where = {
        ...base, tipo: e.tipo,
        vendedorId: e.ambito === "v" ? e.id : null,
        equipoSupervisorId: e.ambito === "e" ? e.id : null,
      };
      const actual = await tx.meta.findFirst({ where });
      const anterior = actual ? Number(actual.valor) : null;
      if (anterior === e.valor) continue;
      if (e.valor === null) await tx.meta.delete({ where: { id: actual!.id } });
      else if (actual) await tx.meta.update({ where: { id: actual.id }, data: { valor: e.valor } });
      else await tx.meta.create({ data: { ...where, valor: e.valor } });
      cambios.push({ ambito: e.ambito, id: e.id, tipo: e.tipo, antes: anterior, despues: e.valor });
    }
    if (cambios.length) {
      await registrarAuditoria({ usuarioId: admin.id, accion: "metas.definir", entidad: "Meta", despues: { ...base, cambios } }, tx);
    }
  });
  revalidatePath("/metas");
  revalidatePath("/");
  return { ok: true, mensaje: cambios.length ? `${cambios.length} meta(s) actualizadas.` : "Sin cambios." };
}

export async function copiarMetasMesAnterior(anio: number, mes: number): Promise<{ error?: string; copiadas?: number }> {
  const admin = await requirePermiso("metas.definir");
  const previo = mesAnterior(anio, mes);
  const origen = await db.meta.findMany({ where: { periodo: "MENSUAL", anio: previo.anio, mes: previo.mes } });
  if (origen.length === 0) return { error: "El mes anterior no tiene metas." };
  let copiadas = 0;
  await db.$transaction(async (tx) => {
    for (const m of origen) {
      const where = { periodo: "MENSUAL" as const, anio, mes, tipo: m.tipo, vendedorId: m.vendedorId, equipoSupervisorId: m.equipoSupervisorId };
      if (await tx.meta.findFirst({ where })) continue;
      await tx.meta.create({ data: { ...where, valor: m.valor } });
      copiadas++;
    }
    await registrarAuditoria({ usuarioId: admin.id, accion: "metas.copiar", entidad: "Meta", despues: { desde: previo, hacia: { anio, mes }, copiadas } }, tx);
  });
  revalidatePath("/metas");
  return { copiadas };
}
