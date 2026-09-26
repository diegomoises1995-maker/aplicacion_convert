import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

/** Parámetros de negocio como números (la fila se crea si no existe). */
export const getConfiguracion = cache(async () => {
  const c = await db.configuracion.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  return {
    ...c,
    igvPorcentaje: Number(c.igvPorcentaje),
    pedidoMinimoMonto: Number(c.pedidoMinimoMonto),
    descuentoMaxVendedor: Number(c.descuentoMaxVendedor),
    descuentoMaxSupervisor: Number(c.descuentoMaxSupervisor),
    factorEnRiesgo: Number(c.factorEnRiesgo),
    umbralCategoriaA: Number(c.umbralCategoriaA),
    umbralCategoriaB: Number(c.umbralCategoriaB),
  };
});

export type Configuracion = Awaited<ReturnType<typeof getConfiguracion>>;
