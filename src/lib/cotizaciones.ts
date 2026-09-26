export type EstadoCotizacion = "BORRADOR" | "PENDIENTE_APROBACION" | "ENVIADA" | "ACEPTADA" | "RECHAZADA" | "VENCIDA" | "CONVERTIDA";

export const NOMBRE_ESTADO_COTIZACION: Record<EstadoCotizacion, string> = {
  BORRADOR: "Lista para enviar",
  PENDIENTE_APROBACION: "Pendiente de aprobación",
  ENVIADA: "Enviada",
  ACEPTADA: "Aceptada",
  RECHAZADA: "Rechazada",
  VENCIDA: "Vencida",
  CONVERTIDA: "Convertida en pedido",
};

export const TONO_ESTADO_COTIZACION = {
  BORRADOR: "neutro",
  PENDIENTE_APROBACION: "amarillo",
  ENVIADA: "marca",
  ACEPTADA: "verde",
  RECHAZADA: "rojo",
  VENCIDA: "rojo",
  CONVERTIDA: "verde",
} as const;

/** Estado a mostrar: las abiertas cuya validez pasó se ven como vencidas. */
export function estadoVisible(estado: EstadoCotizacion, validaHasta: Date | null, ahora = new Date()): EstadoCotizacion {
  const abierta = estado === "BORRADOR" || estado === "ENVIADA" || estado === "ACEPTADA" || estado === "PENDIENTE_APROBACION";
  return abierta && validaHasta && validaHasta < ahora ? "VENCIDA" : estado;
}
