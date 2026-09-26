import type { UsuarioActual } from "@/server/sesion";

// Actividades y oportunidades del cliente (se completa en la Fase 3).
export async function SeccionesSeguimiento(_props: {
  clienteId: string;
  usuario: UsuarioActual;
  whatsapp: string | null;
  cliente: { razonSocial: string; contactoNombre: string | null };
}) {
  return null;
}
