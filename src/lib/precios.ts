// Motor de precios: lista de precios, escalas por volumen, descuento manual, IGV y pedido mínimo.
// Todo sin IGV salvo `total`. Se usa en el navegador (vista previa) y en el servidor (cálculo oficial).
import { redondear } from "@/lib/ventas";
import type { Rol } from "@/lib/permisos";

export type LineaEntrada = {
  modeloId: string;
  colorId: string;
  series: number;
  paresPorSerie: number;
  precioBase: number; // por par
  precioLista?: number | null; // precio específico del modelo en la lista del cliente
};

export type Escala = { desdeSeries: number; descuentoPorcentaje: number };

export type EntradaCalculo = {
  lineas: LineaEntrada[];
  ajusteLista?: number; // % sobre precio base (negativo = descuento)
  escalas: Escala[];
  descuentoManual: number; // %
  igvPorcentaje: number;
};

export function precioPorPar(l: Pick<LineaEntrada, "precioBase" | "precioLista">, ajusteLista = 0) {
  if (l.precioLista !== null && l.precioLista !== undefined) return redondear(l.precioLista);
  return redondear(l.precioBase * (1 + ajusteLista / 100));
}

export function descuentoPorVolumen(totalSeries: number, escalas: Escala[]) {
  return escalas
    .filter((e) => totalSeries >= e.desdeSeries)
    .reduce((max, e) => Math.max(max, e.descuentoPorcentaje), 0);
}

export function calcularTotales(e: EntradaCalculo) {
  const lineas = e.lineas.map((l) => {
    const precioPar = precioPorPar(l, e.ajusteLista);
    const pares = l.series * l.paresPorSerie;
    return { ...l, precioPar, pares, subtotal: redondear(precioPar * pares) };
  });
  const subtotal = redondear(lineas.reduce((s, l) => s + l.subtotal, 0));
  const totalSeries = lineas.reduce((s, l) => s + l.series, 0);
  const totalPares = lineas.reduce((s, l) => s + l.pares, 0);
  const pctVolumen = descuentoPorVolumen(totalSeries, e.escalas);
  const descuentoVolumen = redondear(subtotal * (pctVolumen / 100));
  const trasVolumen = subtotal - descuentoVolumen;
  const descuentoManualMonto = redondear(trasVolumen * (e.descuentoManual / 100));
  const baseImponible = redondear(trasVolumen - descuentoManualMonto);
  const igv = redondear(baseImponible * (e.igvPorcentaje / 100));
  return {
    lineas,
    subtotal,
    totalSeries,
    totalPares,
    pctVolumen,
    descuentoVolumen,
    descuentoManualMonto,
    baseImponible,
    igv,
    total: redondear(baseImponible + igv),
  };
}

export type ReglasMinimo = { pedidoMinimoSeries: number; pedidoMinimoMonto: number; pedidoMinimoCualquiera: boolean };

/** null si cumple el pedido mínimo; si no, el mensaje de error. */
export function validarPedidoMinimo(totalSeries: number, baseImponible: number, r: ReglasMinimo): string | null {
  const porSeries = totalSeries >= r.pedidoMinimoSeries;
  const porMonto = baseImponible >= r.pedidoMinimoMonto;
  const cumple = r.pedidoMinimoCualquiera ? porSeries || porMonto : porSeries && porMonto;
  if (cumple) return null;
  const monto = `S/ ${r.pedidoMinimoMonto.toFixed(2)} sin IGV`;
  return r.pedidoMinimoCualquiera
    ? `El pedido mínimo es ${r.pedidoMinimoSeries} series o ${monto}`
    : `El pedido mínimo es ${r.pedidoMinimoSeries} series y ${monto}`;
}

export type LimitesDescuento = { descuentoMaxVendedor: number; descuentoMaxSupervisor: number };

/** Quién debe aprobar un descuento manual según el rol de quien lo aplica. */
export function aprobacionRequerida(rol: Rol, pct: number, l: LimitesDescuento): null | "SUPERVISOR" | "ADMIN" {
  if (pct <= 0 || rol === "ADMIN") return null;
  if (rol === "VENDEDOR") {
    if (pct <= l.descuentoMaxVendedor) return null;
    return pct <= l.descuentoMaxSupervisor ? "SUPERVISOR" : "ADMIN";
  }
  return pct <= l.descuentoMaxSupervisor ? null : "ADMIN";
}

/** ¿Puede este rol aprobar un descuento de este %? */
export function puedeAprobar(rol: Rol, pct: number, l: LimitesDescuento) {
  if (rol === "ADMIN") return true;
  if (rol === "SUPERVISOR") return pct <= l.descuentoMaxSupervisor;
  return false;
}
