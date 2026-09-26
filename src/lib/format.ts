// Formato determinista (sin Intl) para que servidor y navegador muestren
// exactamente lo mismo y no haya errores de hidratación.
import { partesLima } from "@/lib/fechas";

export const ZONA_HORARIA = "America/Lima";

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

type Numerico = number | string | { toString(): string } | null | undefined;

export function formatNumero(valor: Numerico, decimales = 0) {
  if (valor === null || valor === undefined) return "—";
  const n = Number(valor.toString());
  if (!Number.isFinite(n)) return "—";
  const [entero, dec] = Math.abs(n).toFixed(decimales).split(".");
  const miles = entero!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${n < 0 ? "-" : ""}${miles}${dec ? "." + dec : ""}`;
}

export function formatSoles(valor: Numerico) {
  if (valor === null || valor === undefined) return "—";
  const texto = formatNumero(valor, 2);
  return texto.startsWith("-") ? `-S/ ${texto.slice(1)}` : `S/ ${texto}`;
}

export function formatPorcentaje(valor: number | null | undefined, decimales = 0) {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "—";
  return `${formatNumero(valor * 100, decimales)} %`;
}

export function formatFecha(fecha: Date | string | null | undefined, conHora = false) {
  if (!fecha) return "—";
  const d = new Date(fecha);
  const { anio, mes, dia } = partesLima(d);
  const base = `${dia} ${MESES_CORTOS[mes - 1]} ${anio}`;
  if (!conHora) return base;
  const l = new Date(d.getTime() - 5 * 3_600_000);
  return `${base}, ${String(l.getUTCHours()).padStart(2, "0")}:${String(l.getUTCMinutes()).padStart(2, "0")}`;
}

export function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
