import "server-only";
import { db } from "@/lib/db";
import type { UsuarioActual } from "@/server/sesion";
import { filtroClientes } from "@/server/clientes";

export async function opcionesClientes(usuario: UsuarioActual) {
  const clientes = await db.cliente.findMany({
    where: await filtroClientes(usuario),
    select: { id: true, razonSocial: true, nombreComercial: true },
    orderBy: { razonSocial: "asc" },
  });
  return clientes.map((c) => ({ id: c.id, nombre: c.nombreComercial || c.razonSocial }));
}
