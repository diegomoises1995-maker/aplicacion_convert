// Cálculo de comisiones a partir de reglas configurables.
import { redondear } from "@/lib/ventas";

export type TipoRegla = "PORCENTAJE_VENTA_COBRADA" | "BONO_CUMPLIMIENTO_META" | "BONO_CLIENTE_NUEVO" | "BONO_CLIENTE_REACTIVADO";

export const NOMBRE_TIPO_REGLA: Record<TipoRegla, string> = {
  PORCENTAJE_VENTA_COBRADA: "% sobre venta cobrada",
  BONO_CUMPLIMIENTO_META: "Bono por cumplimiento de meta",
  BONO_CLIENTE_NUEVO: "Bono por cliente nuevo",
  BONO_CLIENTE_REACTIVADO: "Bono por cliente reactivado",
};

export type Regla = { id: string; nombre: string; tipo: TipoRegla; valor: number; umbralCumplimiento: number | null };

export type Resultados = {
  ventaCobrada: number; // sin IGV
  cumplimientoSoles: number | null; // 0-∞ (1 = 100 %)
  clientesNuevos: number;
  clientesReactivados: number;
};

export type LineaComision = { regla: string; tipo: TipoRegla; base: string; monto: number };

export function calcularComision(r: Resultados, reglas: Regla[]) {
  const lineas: LineaComision[] = [];
  let comisionVenta = 0;

  for (const regla of reglas.filter((x) => x.tipo === "PORCENTAJE_VENTA_COBRADA")) {
    const monto = redondear((r.ventaCobrada * regla.valor) / 100);
    comisionVenta += monto;
    lineas.push({ regla: regla.nombre, tipo: regla.tipo, base: `${regla.valor} % de S/ ${r.ventaCobrada.toFixed(2)}`, monto });
  }

  // Bonos por meta escalonados: se paga solo el tramo más alto alcanzado.
  const pct = (r.cumplimientoSoles ?? 0) * 100;
  const tramo = reglas
    .filter((x) => x.tipo === "BONO_CUMPLIMIENTO_META" && x.umbralCumplimiento !== null && pct >= x.umbralCumplimiento)
    .sort((a, b) => (b.umbralCumplimiento ?? 0) - (a.umbralCumplimiento ?? 0))[0];
  if (tramo && r.cumplimientoSoles !== null) {
    lineas.push({ regla: tramo.nombre, tipo: tramo.tipo, base: `Cumplimiento ${pct.toFixed(1)} % ≥ ${tramo.umbralCumplimiento} %`, monto: redondear(tramo.valor) });
  }

  for (const regla of reglas.filter((x) => x.tipo === "BONO_CLIENTE_NUEVO" || x.tipo === "BONO_CLIENTE_REACTIVADO")) {
    const n = regla.tipo === "BONO_CLIENTE_NUEVO" ? r.clientesNuevos : r.clientesReactivados;
    if (n > 0) lineas.push({ regla: regla.nombre, tipo: regla.tipo, base: `${n} × S/ ${regla.valor.toFixed(2)}`, monto: redondear(n * regla.valor) });
  }

  const bonos = redondear(lineas.filter((l) => l.tipo !== "PORCENTAJE_VENTA_COBRADA").reduce((s, l) => s + l.monto, 0));
  comisionVenta = redondear(comisionVenta);
  return { comisionVenta, bonos, total: redondear(comisionVenta + bonos), lineas };
}

/** Los pagos se cobran con IGV; la comisión se calcula sobre el valor de venta. */
export function sinIgv(montoConIgv: number, igvPorcentaje: number) {
  return redondear(montoConIgv / (1 + igvPorcentaje / 100));
}
