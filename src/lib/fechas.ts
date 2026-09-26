// Utilidades de fecha en hora de Lima (UTC-5, sin horario de verano).
const OFFSET_MS = 5 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Año, mes (1-12) y día en Lima para un instante dado. */
export function partesLima(fecha: Date = new Date()) {
  const l = new Date(fecha.getTime() - OFFSET_MS);
  return { anio: l.getUTCFullYear(), mes: l.getUTCMonth() + 1, dia: l.getUTCDate() };
}

/** Inicio (00:00 Lima) del día indicado, como instante UTC. */
export function inicioDiaLima(anio: number, mes: number, dia: number): Date {
  return new Date(Date.UTC(anio, mes - 1, dia) + OFFSET_MS);
}

export function hoyLima(fecha: Date = new Date()) {
  const { anio, mes, dia } = partesLima(fecha);
  const inicio = inicioDiaLima(anio, mes, dia);
  return { inicio, fin: new Date(inicio.getTime() + DIA_MS) };
}

/** Rango [inicio, fin) de un mes calendario en Lima. */
export function rangoMes(anio: number, mes: number) {
  const inicio = inicioDiaLima(anio, mes, 1);
  const fin = mes === 12 ? inicioDiaLima(anio + 1, 1, 1) : inicioDiaLima(anio, mes + 1, 1);
  return { inicio, fin };
}

export function rangoTrimestre(anio: number, trimestre: number) {
  const mesInicio = (trimestre - 1) * 3 + 1;
  return { inicio: rangoMes(anio, mesInicio).inicio, fin: rangoMes(anio, mesInicio + 2).fin };
}

export function mesAnterior(anio: number, mes: number) {
  return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
}

export function sumarMeses(anio: number, mes: number, n: number) {
  const total = anio * 12 + (mes - 1) + n;
  return { anio: Math.floor(total / 12), mes: (total % 12) + 1 };
}

export function diasEnMes(anio: number, mes: number) {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/** Fracción del período transcurrida (0-1) a la fecha dada. */
export function fraccionTranscurrida(inicio: Date, fin: Date, ahora: Date = new Date()) {
  if (ahora <= inicio) return 0;
  if (ahora >= fin) return 1;
  return (ahora.getTime() - inicio.getTime()) / (fin.getTime() - inicio.getTime());
}

export function diasEntre(desde: Date, hasta: Date) {
  return Math.floor((hasta.getTime() - desde.getTime()) / DIA_MS);
}

export function etiquetaMes(anio: number, mes: number, corto = false) {
  const nombre = MESES[mes - 1]!;
  return `${corto ? nombre.slice(0, 3) : nombre} ${anio}`;
}

/** Valor para <input type="date"> en hora de Lima. */
export function aInputFecha(fecha: Date | null | undefined) {
  if (!fecha) return "";
  const { anio, mes, dia } = partesLima(fecha);
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Valor para <input type="datetime-local"> en hora de Lima. */
export function aInputFechaHora(fecha: Date | null | undefined) {
  if (!fecha) return "";
  const l = new Date(fecha.getTime() - OFFSET_MS);
  return l.toISOString().slice(0, 16);
}

/** Interpreta "YYYY-MM-DD" o "YYYY-MM-DDTHH:mm" como hora de Lima. */
export function desdeInputFecha(valor: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(valor.trim());
  if (!m) return null;
  const [, a, me, d, h = "12", mi = "0"] = m;
  return new Date(Date.UTC(+a!, +me! - 1, +d!, +h, +mi) + OFFSET_MS);
}
