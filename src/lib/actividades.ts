export type TipoActividad = "LLAMADA" | "WHATSAPP" | "VISITA" | "REUNION" | "EMAIL" | "TAREA";
export type ResultadoActividad = "PENDIENTE" | "EXITOSA" | "SIN_RESPUESTA" | "REPROGRAMADA" | "NO_INTERESADO";

export const NOMBRE_TIPO_ACTIVIDAD: Record<TipoActividad, string> = {
  LLAMADA: "Llamada",
  WHATSAPP: "WhatsApp",
  VISITA: "Visita",
  REUNION: "Reunión",
  EMAIL: "Correo",
  TAREA: "Tarea",
};

export const NOMBRE_RESULTADO: Record<ResultadoActividad, string> = {
  PENDIENTE: "Pendiente",
  EXITOSA: "Exitosa",
  SIN_RESPUESTA: "Sin respuesta",
  REPROGRAMADA: "Reprogramada",
  NO_INTERESADO: "No interesado",
};

type ConFecha = { fechaProgramada: Date; completada: boolean };

/** Separa las actividades pendientes en vencidas, de hoy y próximas. */
export function clasificarAgenda<T extends ConFecha>(actividades: T[], inicioHoy: Date, finHoy: Date) {
  const pendientes = actividades.filter((a) => !a.completada);
  const orden = (a: T, b: T) => a.fechaProgramada.getTime() - b.fechaProgramada.getTime();
  return {
    vencidas: pendientes.filter((a) => a.fechaProgramada < inicioHoy).sort(orden),
    hoy: pendientes.filter((a) => a.fechaProgramada >= inicioHoy && a.fechaProgramada < finHoy).sort(orden),
    proximas: pendientes.filter((a) => a.fechaProgramada >= finHoy).sort(orden),
  };
}
