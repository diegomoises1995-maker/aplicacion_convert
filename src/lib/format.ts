export const ZONA_HORARIA = "America/Lima";

const soles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

export function formatSoles(valor: number | string | { toString(): string } | null | undefined) {
  if (valor === null || valor === undefined) return "—";
  return soles.format(Number(valor.toString()));
}

export function formatFecha(fecha: Date | string | null | undefined, conHora = false) {
  if (!fecha) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: ZONA_HORARIA,
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(conHora ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(fecha));
}

export function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
