// Qué pedidos cuentan como venta efectiva (para métricas, metas y dashboards):
// los que tienen el pago verificado en adelante. Pendientes y cancelados no cuentan.
export const ESTADOS_VENTA = ["PAGO_VERIFICADO", "EN_PREPARACION", "ENVIADO", "ENTREGADO"] as const;

export function redondear(valor: number, decimales = 2) {
  const f = 10 ** decimales;
  return Math.round((valor + Number.EPSILON) * f) / f;
}
