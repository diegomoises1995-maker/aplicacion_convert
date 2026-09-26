import "server-only";
import { db } from "@/lib/db";
import { alcanceIncluye, filtroEquipo } from "@/lib/alcance";
import { getAlcance, type UsuarioActual } from "@/server/sesion";

/**
 * Filtro de clientes visibles. Los clientes sin vendedor asignado los ven
 * el administrador y los supervisores (para poder asignarlos).
 */
export async function filtroClientes(usuario: UsuarioActual) {
  const alcance = await getAlcance(usuario);
  if (alcance.tipo === "todos") return {};
  if (usuario.rol === "SUPERVISOR") {
    return { OR: [{ vendedorId: { in: alcance.ids } }, { vendedorId: null }] };
  }
  return { vendedorId: { in: alcance.ids } };
}

export async function puedeVerCliente(usuario: UsuarioActual, cliente: { vendedorId: string | null }) {
  if (cliente.vendedorId === null) return usuario.rol !== "VENDEDOR";
  return alcanceIncluye(await getAlcance(usuario), cliente.vendedorId);
}

/** Vendedores a los que el usuario puede asignar clientes. */
export async function vendedoresAsignables(usuario: UsuarioActual) {
  const alcance = await getAlcance(usuario);
  return db.user.findMany({
    where: { ...filtroEquipo(alcance), activo: true, rol: { in: ["VENDEDOR", "SUPERVISOR"] } },
    select: { id: true, nombre: true, email: true },
    orderBy: { nombre: "asc" },
  });
}
