import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { calcularAlcance, alcanceIncluye, type Alcance } from "@/lib/alcance";
import { tienePermiso, type Permiso } from "@/lib/permisos";

// Capa de acceso a datos: TODA página o acción de servidor obtiene el usuario
// desde aquí. Se relee de la base de datos en cada request para que un
// usuario desactivado o con rol cambiado pierda el acceso de inmediato,
// aunque su JWT siga vigente.

export const getUsuarioActual = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  const usuario = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
      supervisorId: true,
      zonaId: true,
    },
  });
  if (!usuario || !usuario.activo) return null;
  return usuario;
});

export type UsuarioActual = NonNullable<Awaited<ReturnType<typeof getUsuarioActual>>>;

export async function requireUsuario(): Promise<UsuarioActual> {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect("/login");
  return usuario;
}

export async function requirePermiso(permiso: Permiso): Promise<UsuarioActual> {
  const usuario = await requireUsuario();
  if (!tienePermiso(usuario.rol, permiso)) redirect("/?acceso=denegado");
  return usuario;
}

const idsEquipo = cache(async (supervisorId: string) => {
  const equipo = await db.user.findMany({ where: { supervisorId }, select: { id: true } });
  return equipo.map((u) => u.id);
});

export async function getAlcance(usuario: UsuarioActual): Promise<Alcance> {
  const equipo = usuario.rol === "SUPERVISOR" ? await idsEquipo(usuario.id) : [];
  return calcularAlcance(usuario.rol, usuario.id, equipo);
}

export async function puedeVerVendedor(usuario: UsuarioActual, vendedorId: string | null) {
  return alcanceIncluye(await getAlcance(usuario), vendedorId);
}
