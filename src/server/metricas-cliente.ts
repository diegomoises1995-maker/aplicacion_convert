import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ESTADOS_VENTA, redondear } from "@/lib/ventas";
import { calcularCategoria, calcularEstadoCliente, calcularFrecuenciaDias } from "@/lib/clientes";
import { getConfiguracion, type Configuracion } from "@/server/configuracion";

type Tx = Prisma.TransactionClient | typeof db;

/**
 * Recalcula las métricas desnormalizadas de un cliente (primera/última compra,
 * frecuencia, ticket promedio, compras 12m, estado y categoría) a partir de sus pedidos.
 */
export async function recalcularMetricasCliente(
  clienteId: string,
  opciones: { tx?: Tx; config?: Configuracion; ahora?: Date } = {},
) {
  const tx = opciones.tx ?? db;
  const config = opciones.config ?? (await getConfiguracion());
  const ahora = opciones.ahora ?? new Date();

  const [cliente, pedidos] = await Promise.all([
    tx.cliente.findUniqueOrThrow({ where: { id: clienteId }, select: { categoria: true, categoriaManual: true } }),
    tx.pedido.findMany({
      where: { clienteId, estado: { in: [...ESTADOS_VENTA] } },
      select: { fecha: true, baseImponible: true },
      orderBy: { fecha: "asc" },
    }),
  ]);

  const fechas = pedidos.map((p) => p.fecha);
  const primeraCompra = fechas[0] ?? null;
  const ultimaCompra = fechas[fechas.length - 1] ?? null;
  const frecuenciaDias = calcularFrecuenciaDias(fechas);
  const total = pedidos.reduce((s, p) => s + Number(p.baseImponible), 0);
  const hace12m = new Date(ahora.getTime() - 365 * 86_400_000);
  const total12m = pedidos.filter((p) => p.fecha >= hace12m).reduce((s, p) => s + Number(p.baseImponible), 0);

  const estado = calcularEstadoCliente({ primeraCompra, ultimaCompra, frecuenciaDias }, config, ahora);
  const categoria = cliente.categoriaManual
    ? cliente.categoria
    : calcularCategoria(total12m, config.umbralCategoriaA, config.umbralCategoriaB);

  return tx.cliente.update({
    where: { id: clienteId },
    data: {
      primeraCompra,
      ultimaCompra,
      frecuenciaDias,
      numeroPedidos: pedidos.length,
      ticketPromedio: pedidos.length ? redondear(total / pedidos.length) : null,
      totalComprado12m: redondear(total12m),
      estado,
      categoria,
    },
    select: { id: true, estado: true, categoria: true },
  });
}
