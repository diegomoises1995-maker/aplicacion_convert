import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requirePermiso } from "@/server/sesion";
import { Card, EncabezadoPagina } from "@/components/ui/card";
import { FormularioUsuario } from "../formulario-usuario";

export const metadata: Metadata = { title: "Nuevo usuario" };

export default async function NuevoUsuarioPage() {
  await requirePermiso("usuarios.gestionar");
  const [zonas, supervisores] = await Promise.all([
    db.zona.findMany({ where: { activa: true }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    db.user.findMany({ where: { rol: "SUPERVISOR", activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
  ]);
  return (
    <>
      <EncabezadoPagina titulo="Nuevo usuario" descripcion="Vendedor, supervisor o administrador" />
      <Card>
        <FormularioUsuario zonas={zonas} supervisores={supervisores} />
      </Card>
    </>
  );
}
