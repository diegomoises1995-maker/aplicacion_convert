import "server-only";
import { db } from "@/lib/db";
import { ESTADOS_VENTA, redondear } from "@/lib/ventas";
import { rangoMes, rangoTrimestre, fraccionTranscurrida } from "@/lib/fechas";
import { cumplimiento, semaforo, TIPOS_META, type Semaforo, type TipoMeta } from "@/lib/metas";
import { calcularComision, sinIgv, type Regla } from "@/lib/comisiones";
import { getConfiguracion } from "@/server/configuracion";

export type Periodo = { periodo: "MENSUAL" | "TRIMESTRAL"; anio: number; mes?: number; trimestre?: number };

export function rangoPeriodo(p: Periodo) {
  return p.periodo === "MENSUAL" ? rangoMes(p.anio, p.mes!) : rangoTrimestre(p.anio, p.trimestre!);
}

export type Ventas = { soles: number; pares: number; pedidos: number; nuevos: number; reactivados: number };
const VACIO: Ventas = { soles: 0, pares: 0, pedidos: 0, nuevos: 0, reactivados: 0 };

/** Ventas efectivas (pago verificado en adelante) por vendedor en [inicio, fin). */
export async function ventasPorVendedor(inicio: Date, fin: Date, vendedorIds?: string[]) {
  const where = {
    estado: { in: [...ESTADOS_VENTA] },
    fecha: { gte: inicio, lt: fin },
    ...(vendedorIds ? { vendedorId: { in: vendedorIds } } : {}),
  };
  const [totales, nuevos, reactivados] = await Promise.all([
    db.pedido.groupBy({ by: ["vendedorId"], where, _sum: { baseImponible: true, totalPares: true }, _count: true }),
    db.pedido.groupBy({ by: ["vendedorId"], where: { ...where, esPrimerPedido: true }, _count: true }),
    db.pedido.groupBy({ by: ["vendedorId"], where: { ...where, esReactivacion: true }, _count: true }),
  ]);
  const r = new Map<string, Ventas>();
  for (const t of totales) {
    r.set(t.vendedorId, {
      soles: redondear(Number(t._sum.baseImponible ?? 0)),
      pares: t._sum.totalPares ?? 0,
      pedidos: t._count,
      nuevos: nuevos.find((n) => n.vendedorId === t.vendedorId)?._count ?? 0,
      reactivados: reactivados.find((n) => n.vendedorId === t.vendedorId)?._count ?? 0,
    });
  }
  return r;
}

export function sumarVentas(vs: Iterable<Ventas>): Ventas {
  const t = { ...VACIO };
  for (const v of vs) {
    t.soles += v.soles; t.pares += v.pares; t.pedidos += v.pedidos; t.nuevos += v.nuevos; t.reactivados += v.reactivados;
  }
  t.soles = redondear(t.soles);
  return t;
}

export function valorVenta(v: Ventas | undefined, tipo: TipoMeta) {
  if (!v) return 0;
  return tipo === "SOLES" ? v.soles : tipo === "PARES" ? v.pares : tipo === "CLIENTES_NUEVOS" ? v.nuevos : v.reactivados;
}

/** Metas del período: individuales, de equipo y de empresa. */
export async function metasDelPeriodo(p: Periodo) {
  const metas = await db.meta.findMany({
    where: {
      periodo: p.periodo, anio: p.anio,
      ...(p.periodo === "MENSUAL" ? { mes: p.mes } : { trimestre: p.trimestre }),
    },
  });
  const clave = (vendedorId: string | null, equipo: string | null, tipo: TipoMeta) => `${vendedorId ?? ""}|${equipo ?? ""}|${tipo}`;
  const mapa = new Map(metas.map((m) => [clave(m.vendedorId, m.equipoSupervisorId, m.tipo), Number(m.valor)]));
  return {
    individual: (vendedorId: string, tipo: TipoMeta) => mapa.get(clave(vendedorId, null, tipo)) ?? null,
    equipo: (supervisorId: string, tipo: TipoMeta) => mapa.get(clave(null, supervisorId, tipo)) ?? null,
    empresa: (tipo: TipoMeta) => mapa.get(clave(null, null, tipo)) ?? null,
  };
}

export type IndicadorMeta = { tipo: TipoMeta; meta: number | null; real: number; cumplimiento: number | null; semaforo: Semaforo };

export async function indicadoresMeta(real: Ventas | undefined, metaDe: (t: TipoMeta) => number | null, fraccion: number) {
  const cfg = await getConfiguracion();
  return TIPOS_META.map((tipo): IndicadorMeta => {
    const meta = metaDe(tipo);
    const r = valorVenta(real, tipo);
    return { tipo, meta, real: r, cumplimiento: cumplimiento(r, meta), semaforo: semaforo(r, meta, fraccion, cfg) };
  });
}

export function fraccionPeriodo(p: Periodo, ahora = new Date()) {
  const { inicio, fin } = rangoPeriodo(p);
  return fraccionTranscurrida(inicio, fin, ahora);
}

// ─────────────────────────── Comisiones ───────────────────────────

export async function reglasVigentes(inicio: Date, fin: Date): Promise<Regla[]> {
  const reglas = await db.reglaComision.findMany({
    where: { activa: true, vigenteDesde: { lt: fin }, OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: inicio } }] },
  });
  return reglas.map((r) => ({
    id: r.id, nombre: r.nombre, tipo: r.tipo, valor: Number(r.valor),
    umbralCumplimiento: r.umbralCumplimiento === null ? null : Number(r.umbralCumplimiento),
  }));
}

/** Comisión de un vendedor en un mes: venta cobrada (pagos verificados), meta y clientes nuevos. */
export async function calcularComisionMes(vendedorId: string, anio: number, mes: number) {
  const { inicio, fin } = rangoMes(anio, mes);
  const [cfg, pagos, ventas, metas, reglas] = await Promise.all([
    getConfiguracion(),
    db.pago.aggregate({
      where: { verificado: true, fecha: { gte: inicio, lt: fin }, pedido: { vendedorId, estado: { not: "CANCELADO" } } },
      _sum: { monto: true },
    }),
    ventasPorVendedor(inicio, fin, [vendedorId]),
    metasDelPeriodo({ periodo: "MENSUAL", anio, mes }),
    reglasVigentes(inicio, fin),
  ]);
  const v = ventas.get(vendedorId);
  const ventaCobrada = sinIgv(Number(pagos._sum.monto ?? 0), cfg.igvPorcentaje);
  const cumplimientoSoles = cumplimiento(v?.soles ?? 0, metas.individual(vendedorId, "SOLES"));
  const resultados = {
    ventaCobrada,
    cumplimientoSoles,
    clientesNuevos: v?.nuevos ?? 0,
    clientesReactivados: v?.reactivados ?? 0,
  };
  return { resultados, ...calcularComision(resultados, reglas) };
}
