export type Etapa = "PROSPECTO" | "CONTACTADO" | "COTIZACION_ENVIADA" | "NEGOCIACION" | "GANADO" | "PERDIDO";

export const ETAPAS: Etapa[] = ["PROSPECTO", "CONTACTADO", "COTIZACION_ENVIADA", "NEGOCIACION", "GANADO", "PERDIDO"];

export const NOMBRE_ETAPA: Record<Etapa, string> = {
  PROSPECTO: "Prospecto",
  CONTACTADO: "Contactado",
  COTIZACION_ENVIADA: "Cotización enviada",
  NEGOCIACION: "Negociación",
  GANADO: "Ganado",
  PERDIDO: "Perdido",
};

// Probabilidad de cierre por etapa, para el pronóstico ponderado.
export const PROBABILIDAD: Record<Etapa, number> = {
  PROSPECTO: 0.1,
  CONTACTADO: 0.25,
  COTIZACION_ENVIADA: 0.5,
  NEGOCIACION: 0.75,
  GANADO: 1,
  PERDIDO: 0,
};

export const MOTIVOS_PERDIDA = [
  "Precio",
  "Eligió a la competencia",
  "Sin stock / tallas",
  "Tiempo de entrega",
  "Forma de pago / crédito",
  "Cliente no respondió",
  "Pedido postergado",
  "Otro",
];

export function esCerrada(etapa: Etapa) {
  return etapa === "GANADO" || etapa === "PERDIDO";
}

export function validarCambioEtapa(etapa: Etapa, motivoPerdida?: string | null): string | null {
  if (etapa === "PERDIDO" && !motivoPerdida?.trim()) return "Indica el motivo de pérdida";
  return null;
}

type Op = { etapa: Etapa; valorEstimado: number };

/** Totales por etapa, pronóstico ponderado y tasa de conversión (ganadas / cerradas). */
export function resumenPipeline(ops: Op[]) {
  const porEtapa = Object.fromEntries(ETAPAS.map((e) => [e, { cantidad: 0, valor: 0 }])) as Record<Etapa, { cantidad: number; valor: number }>;
  let ponderado = 0;
  for (const o of ops) {
    porEtapa[o.etapa].cantidad++;
    porEtapa[o.etapa].valor += o.valorEstimado;
    if (!esCerrada(o.etapa)) ponderado += o.valorEstimado * PROBABILIDAD[o.etapa];
  }
  const cerradas = porEtapa.GANADO.cantidad + porEtapa.PERDIDO.cantidad;
  return {
    porEtapa,
    ponderado: Math.round(ponderado * 100) / 100,
    abiertas: ops.filter((o) => !esCerrada(o.etapa)).length,
    conversion: cerradas ? porEtapa.GANADO.cantidad / cerradas : null,
  };
}
