import "server-only";
import { db } from "@/lib/db";
import { getConfiguracion, type Configuracion } from "@/server/configuracion";
import { recalcularCliente, reglasDesdeConfig, type Tx } from "@/server/metricas-core";

/**
 * Recalcula las métricas desnormalizadas de un cliente (primera/última compra,
 * frecuencia, ticket promedio, compras 12m, estado y categoría) a partir de sus pedidos.
 */
export async function recalcularMetricasCliente(
  clienteId: string,
  opciones: { tx?: Tx; config?: Configuracion; ahora?: Date } = {},
) {
  const config = opciones.config ?? (await getConfiguracion());
  return recalcularCliente(opciones.tx ?? db, clienteId, reglasDesdeConfig(config), opciones.ahora);
}
