// Núcleo del cálculo de métricas de cliente, sin dependencias de Next (lo usan
// las acciones de servidor, la tarea diaria y el seed).
import type { Prisma, PrismaClient } from "@prisma/client";
import { ESTADOS_VENTA, redondear } from "@/lib/ventas";
import { calcularCategoria, calcularEstadoCliente, calcularFrecuenciaDias, type ReglasEstado } from "@/lib/clientes";

export type Tx = Prisma.TransactionClient | PrismaClient;
export type ReglasMetricas = ReglasEstado & { umbralCategoriaA: number; umbralCategoriaB: number };

export function reglasDesdeConfig(c: {
  diasClienteNuevo: number; factorEnRiesgo: unknown; diasClienteInactivo: number; frecuenciaDefectoDias: number;
  umbralCategoriaA: unknown; umbralCategoriaB: unknown;
}): ReglasMetricas {
  return {
    diasClienteNuevo: c.diasClienteNuevo,
    factorEnRiesgo: Number(c.factorEnRiesgo),
    diasClienteInactivo: c.diasClienteInactivo,
    frecuenciaDefectoDias: c.frecuenciaDefectoDias,
    umbralCategoriaA: Number(c.umbralCategoriaA),
    umbralCategoriaB: Number(c.umbralCategoriaB),
  };
}

export async function recalcularCliente(tx: Tx, clienteId: string, reglas: ReglasMetricas, ahora = new Date()) {
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

  return tx.cliente.update({
    where: { id: clienteId },
    data: {
      primeraCompra,
      ultimaCompra,
      frecuenciaDias,
      numeroPedidos: pedidos.length,
      ticketPromedio: pedidos.length ? redondear(total / pedidos.length) : null,
      totalComprado12m: redondear(total12m),
      estado: calcularEstadoCliente({ primeraCompra, ultimaCompra, frecuenciaDias }, reglas, ahora),
      categoria: cliente.categoriaManual ? cliente.categoria : calcularCategoria(total12m, reglas.umbralCategoriaA, reglas.umbralCategoriaB),
    },
    select: { id: true, estado: true, categoria: true },
  });
}
