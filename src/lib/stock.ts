// Stock por talla: cada serie consume la distribución de su curva de tallas.
export type Distribucion = Record<string, number>; // talla -> pares por serie

export function paresPorSerie(d: Distribucion) {
  return Object.values(d).reduce((s, n) => s + n, 0);
}

export function tallasDe(d: Distribucion) {
  return Object.keys(d).map(Number).sort((a, b) => a - b);
}

export const claveVariante = (modeloId: string, colorId: string, talla: number) => `${modeloId}|${colorId}|${talla}`;

/** Pares necesarios por variante (modelo+color+talla) para un conjunto de líneas. */
export function necesidadPorVariante(lineas: { modeloId: string; colorId: string; series: number; distribucion: Distribucion }[]) {
  const req = new Map<string, number>();
  for (const l of lineas) {
    for (const [talla, pares] of Object.entries(l.distribucion)) {
      const k = claveVariante(l.modeloId, l.colorId, Number(talla));
      req.set(k, (req.get(k) ?? 0) + pares * l.series);
    }
  }
  return req;
}

/** Series completas que se pueden armar con el stock disponible de un color. */
export function seriesDisponibles(d: Distribucion, stockPorTalla: Record<string, number>) {
  let min = Infinity;
  for (const [talla, pares] of Object.entries(d)) {
    if (pares <= 0) continue;
    min = Math.min(min, Math.floor((stockPorTalla[talla] ?? 0) / pares));
  }
  return Number.isFinite(min) ? min : 0;
}

/** Variantes con stock insuficiente: [clave, necesario, disponible]. */
export function faltantes(req: Map<string, number>, stock: Map<string, number>) {
  const r: { clave: string; necesario: number; disponible: number }[] = [];
  for (const [clave, necesario] of req) {
    const disponible = stock.get(clave) ?? 0;
    if (disponible < necesario) r.push({ clave, necesario, disponible });
  }
  return r;
}
