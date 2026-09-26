import "server-only";
import { db } from "@/lib/db";
import { tienePermiso } from "@/lib/permisos";
import type { UsuarioActual } from "@/server/sesion";
import { vendedoresAsignables } from "@/server/clientes";

export async function datosFormularioCliente(usuario: UsuarioActual) {
  const puedeAsignar = tienePermiso(usuario.rol, "clientes.reasignar");
  const [zonas, vendedores, listas] = await Promise.all([
    db.zona.findMany({ where: { activa: true }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    puedeAsignar ? vendedoresAsignables(usuario) : [],
    db.listaPrecio.findMany({ where: { activa: true }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
  ]);
  return { zonas, vendedores, listas, puedeAsignar, puedeCategorizar: usuario.rol !== "VENDEDOR" };
}
