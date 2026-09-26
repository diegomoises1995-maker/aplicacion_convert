// Reglas de negocio de clientes: estado (nuevo/activo/en riesgo/inactivo) y categoría A/B/C.
import { diasEntre } from "@/lib/fechas";

export type EstadoCliente = "PROSPECTO" | "NUEVO" | "ACTIVO" | "EN_RIESGO" | "INACTIVO";
export type CategoriaCliente = "A" | "B" | "C";

export const NOMBRE_ESTADO: Record<EstadoCliente, string> = {
  PROSPECTO: "Prospecto",
  NUEVO: "Nuevo",
  ACTIVO: "Activo",
  EN_RIESGO: "En riesgo",
  INACTIVO: "Inactivo",
};

export const TONO_ESTADO = {
  PROSPECTO: "neutro",
  NUEVO: "marca",
  ACTIVO: "verde",
  EN_RIESGO: "amarillo",
  INACTIVO: "rojo",
} as const;

export const NOMBRE_TIPO_CLIENTE = {
  TIENDA: "Tienda",
  REVENDEDOR: "Revendedor",
  DISTRIBUIDOR: "Distribuidor",
  OTRO: "Otro",
} as const;

export type ReglasEstado = {
  diasClienteNuevo: number;
  factorEnRiesgo: number;
  diasClienteInactivo: number;
  frecuenciaDefectoDias: number;
};

export type HistorialCompras = {
  primeraCompra: Date | null;
  ultimaCompra: Date | null;
  frecuenciaDias: number | null;
};

/** Días que se espera entre compras (frecuencia propia o la de la empresa). */
export function frecuenciaEsperada(h: HistorialCompras, reglas: ReglasEstado) {
  return h.frecuenciaDias && h.frecuenciaDias > 0 ? h.frecuenciaDias : reglas.frecuenciaDefectoDias;
}

export function calcularEstadoCliente(
  h: HistorialCompras,
  reglas: ReglasEstado,
  ahora: Date = new Date(),
): EstadoCliente {
  if (!h.ultimaCompra || !h.primeraCompra) return "PROSPECTO";
  const diasSinComprar = diasEntre(h.ultimaCompra, ahora);
  if (diasSinComprar > reglas.diasClienteInactivo) return "INACTIVO";
  if (diasSinComprar > frecuenciaEsperada(h, reglas) * reglas.factorEnRiesgo) return "EN_RIESGO";
  if (diasEntre(h.primeraCompra, ahora) <= reglas.diasClienteNuevo) return "NUEVO";
  return "ACTIVO";
}

/** Promedio de días entre compras consecutivas; null con menos de 2 compras. */
export function calcularFrecuenciaDias(fechas: Date[]): number | null {
  if (fechas.length < 2) return null;
  const orden = [...fechas].sort((a, b) => a.getTime() - b.getTime());
  const total = diasEntre(orden[0]!, orden[orden.length - 1]!);
  return Math.max(1, Math.round(total / (orden.length - 1)));
}

export function calcularCategoria(
  compras12m: number,
  umbralA: number,
  umbralB: number,
): CategoriaCliente {
  if (compras12m >= umbralA) return "A";
  if (compras12m >= umbralB) return "B";
  return "C";
}

/** ¿Superó su frecuencia habitual sin comprar? (base de la alerta de recompra) */
export function necesitaRecompra(h: HistorialCompras, reglas: ReglasEstado, ahora: Date = new Date()) {
  if (!h.ultimaCompra) return null;
  const frecuencia = frecuenciaEsperada(h, reglas);
  const dias = diasEntre(h.ultimaCompra, ahora);
  return dias > frecuencia ? { diasSinCompra: dias, frecuenciaDias: frecuencia } : null;
}

/** Normaliza un celular peruano a formato internacional para wa.me (51XXXXXXXXX). */
export function numeroWhatsApp(valor: string | null | undefined): string | null {
  if (!valor) return null;
  let d = valor.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9 && d.startsWith("9")) d = "51" + d;
  return d.length >= 11 ? d : null;
}
