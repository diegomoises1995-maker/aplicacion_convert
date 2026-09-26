import type { ZodError } from "zod";

// Estado estándar que devuelven las Server Actions de formularios.
export type EstadoForm = {
  ok?: boolean;
  mensaje?: string;
  error?: string;
  errores?: Record<string, string>;
} | undefined;

export function erroresDeZod(error: ZodError): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const issue of error.issues) {
    const clave = issue.path.join(".") || "_";
    errores[clave] ??= issue.message;
  }
  return errores;
}

/** Convierte FormData en objeto; los campos vacíos pasan a undefined. */
export function datosForm(formData: FormData): Record<string, string | undefined> {
  const obj: Record<string, string | undefined> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v !== "string") continue;
    const t = v.trim();
    obj[k] = t === "" ? undefined : t;
  }
  return obj;
}
