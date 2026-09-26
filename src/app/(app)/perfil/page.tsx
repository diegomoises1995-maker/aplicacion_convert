import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { db } from "@/lib/db";
import { requireUsuario } from "@/server/sesion";
import { cerrarSesion } from "@/server/acciones/auth";
import { NOMBRE_ROL } from "@/lib/permisos";
import { Button } from "@/components/ui/button";
import { Card, CardTitulo, EncabezadoPagina } from "@/components/ui/card";
import { FormularioPassword } from "./formulario-password";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function PerfilPage() {
  const usuario = await requireUsuario();
  const datos = await db.user.findUniqueOrThrow({
    where: { id: usuario.id },
    select: {
      telefono: true,
      zona: { select: { nombre: true } },
      supervisor: { select: { nombre: true } },
    },
  });

  return (
    <>
      <EncabezadoPagina titulo="Mi perfil" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitulo>Mis datos</CardTitulo>
          <dl className="mt-3 grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
            <dt className="text-texto-suave">Nombre</dt>
            <dd>{usuario.nombre}</dd>
            <dt className="text-texto-suave">Correo</dt>
            <dd className="break-all">{usuario.email}</dd>
            <dt className="text-texto-suave">Teléfono</dt>
            <dd>{datos.telefono ?? "—"}</dd>
            <dt className="text-texto-suave">Rol</dt>
            <dd>{NOMBRE_ROL[usuario.rol]}</dd>
            <dt className="text-texto-suave">Zona</dt>
            <dd>{datos.zona?.nombre ?? "—"}</dd>
            <dt className="text-texto-suave">Supervisor</dt>
            <dd>{datos.supervisor?.nombre ?? "—"}</dd>
          </dl>
          <form action={cerrarSesion} className="mt-5 md:hidden">
            <Button variante="secundario" className="w-full">
              <LogOut className="size-4" aria-hidden /> Cerrar sesión
            </Button>
          </form>
        </Card>
        <Card>
          <CardTitulo>Cambiar contraseña</CardTitulo>
          <FormularioPassword />
        </Card>
      </div>
    </>
  );
}
