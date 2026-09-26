// Cumplimiento de metas y semáforo.
export type TipoMeta = "SOLES" | "PARES" | "CLIENTES_NUEVOS" | "CLIENTES_REACTIVADOS";
export type Semaforo = "verde" | "amarillo" | "rojo" | "sin_meta";

export const TIPOS_META: TipoMeta[] = ["SOLES", "PARES", "CLIENTES_NUEVOS", "CLIENTES_REACTIVADOS"];

export const NOMBRE_TIPO_META: Record<TipoMeta, string> = {
  SOLES: "Ventas (S/ sin IGV)",
  PARES: "Pares",
  CLIENTES_NUEVOS: "Clientes nuevos",
  CLIENTES_REACTIVADOS: "Clientes reactivados",
};

export type UmbralesSemaforo = { semaforoVerde: number; semaforoAmarillo: number };

/** % de cumplimiento (0-∞) o null si no hay meta. */
export function cumplimiento(real: number, meta: number | null | undefined) {
  if (!meta || meta <= 0) return null;
  return real / meta;
}

/**
 * Semáforo comparando el avance real contra lo esperado a la fecha
 * (a mitad de mes se espera el 50 % de la meta).
 */
export function semaforo(real: number, meta: number | null | undefined, fraccion: number, u: UmbralesSemaforo): Semaforo {
  const c = cumplimiento(real, meta);
  if (c === null) return "sin_meta";
  const esperado = Math.max(fraccion, 0.05); // evita juzgar el primer día del mes
  const ritmo = (c / esperado) * 100;
  if (ritmo >= u.semaforoVerde) return "verde";
  if (ritmo >= u.semaforoAmarillo) return "amarillo";
  return "rojo";
}

/** Proyección al cierre del período según el ritmo actual. */
export function proyeccion(real: number, fraccion: number) {
  if (fraccion <= 0) return real;
  return real / Math.min(1, fraccion);
}

/** Variación relativa (null si no hay base). */
export function variacion(actual: number, anterior: number) {
  if (!anterior) return null;
  return (actual - anterior) / anterior;
}

export const ESTILO_SEMAFORO: Record<Semaforo, { texto: string; clase: string; barra: string }> = {
  verde: { texto: "En camino", clase: "bg-emerald-50 text-emerald-700", barra: "bg-emerald-600" },
  amarillo: { texto: "Atención", clase: "bg-amber-50 text-amber-800", barra: "bg-amber-500" },
  rojo: { texto: "En riesgo", clase: "bg-red-50 text-red-700", barra: "bg-red-600" },
  sin_meta: { texto: "Sin meta", clase: "bg-stone-100 text-stone-600", barra: "bg-stone-400" },
};
