import type { Rol } from "@/lib/permisos";

// Alcance de datos de un usuario: qué vendedores (y por tanto qué clientes,
// oportunidades, pedidos, metas…) puede ver. Módulo puro y testeable.
export type Alcance = { tipo: "todos" } | { tipo: "vendedores"; ids: string[] };

export function calcularAlcance(rol: Rol, usuarioId: string, idsEquipo: string[]): Alcance {
  switch (rol) {
    case "ADMIN":
      return { tipo: "todos" };
    case "SUPERVISOR":
      // El supervisor ve a su equipo y lo que tenga a su nombre.
      return { tipo: "vendedores", ids: [usuarioId, ...idsEquipo] };
    case "VENDEDOR":
      return { tipo: "vendedores", ids: [usuarioId] };
  }
}

export function alcanceIncluye(alcance: Alcance, vendedorId: string | null | undefined): boolean {
  if (alcance.tipo === "todos") return true;
  return !!vendedorId && alcance.ids.includes(vendedorId);
}

// Filtro Prisma para cualquier modelo con columna `vendedorId`.
export function filtroVendedor(alcance: Alcance): { vendedorId?: { in: string[] } } {
  return alcance.tipo === "todos" ? {} : { vendedorId: { in: alcance.ids } };
}

// Filtro Prisma sobre usuarios visibles (módulo Equipo).
export function filtroEquipo(alcance: Alcance): { id?: { in: string[] } } {
  return alcance.tipo === "todos" ? {} : { id: { in: alcance.ids } };
}
