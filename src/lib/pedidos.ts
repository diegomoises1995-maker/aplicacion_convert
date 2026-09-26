// Flujo de estados del pedido y sus reglas.
export type EstadoPedido = "PENDIENTE_PAGO" | "PAGO_VERIFICADO" | "EN_PREPARACION" | "ENVIADO" | "ENTREGADO" | "CANCELADO";

export const NOMBRE_ESTADO_PEDIDO: Record<EstadoPedido, string> = {
  PENDIENTE_PAGO: "Pendiente de pago",
  PAGO_VERIFICADO: "Pago verificado",
  EN_PREPARACION: "En preparación",
  ENVIADO: "Enviado",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

export const TONO_ESTADO_PEDIDO = {
  PENDIENTE_PAGO: "amarillo",
  PAGO_VERIFICADO: "marca",
  EN_PREPARACION: "marca",
  ENVIADO: "neutro",
  ENTREGADO: "verde",
  CANCELADO: "rojo",
} as const;

const TRANSICIONES: Record<EstadoPedido, EstadoPedido[]> = {
  PENDIENTE_PAGO: ["PAGO_VERIFICADO", "CANCELADO"],
  PAGO_VERIFICADO: ["EN_PREPARACION", "CANCELADO"],
  EN_PREPARACION: ["ENVIADO", "CANCELADO"],
  ENVIADO: ["ENTREGADO"],
  ENTREGADO: [],
  CANCELADO: [],
};

export function transicionesPosibles(estado: EstadoPedido): EstadoPedido[] {
  return TRANSICIONES[estado];
}

export function puedeTransicionar(desde: EstadoPedido, hacia: EstadoPedido) {
  return TRANSICIONES[desde].includes(hacia);
}

/** El stock se descuenta al verificar el pago y se devuelve si se cancela después. */
export function descuentaStock(estado: EstadoPedido) {
  return estado === "PAGO_VERIFICADO" || estado === "EN_PREPARACION" || estado === "ENVIADO" || estado === "ENTREGADO";
}

export const AGENCIAS_ENVIO = [
  "Shalom", "Olva Courier", "Marvisur", "Cruz del Sur Cargo", "Flores", "Civa", "Recojo en almacén", "Otra",
];
