/** Reemplaza {cliente}, {contacto}, {vendedor}, {empresa} en una plantilla. */
export function aplicarPlantilla(mensaje: string, vars: Record<string, string | null | undefined>) {
  return mensaje.replace(/\{(\w+)\}/g, (_m, k: string) => vars[k] ?? "").replace(/ {2,}/g, " ").trim();
}

export function enlaceWhatsApp(numero: string, mensaje?: string) {
  return `https://wa.me/${numero}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ""}`;
}
