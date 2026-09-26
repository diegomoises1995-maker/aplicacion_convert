export const NOMBRE_GENERO = { CABALLERO: "Caballero", DAMA: "Dama", NINO: "Niño", UNISEX: "Unisex" } as const;

/** "38:1, 39:2, ..." a partir de la distribución de una curva. */
export function textoCurva(d: Record<string, number>) {
  return Object.entries(d)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([t, n]) => `${t}:${n}`)
    .join(", ");
}
