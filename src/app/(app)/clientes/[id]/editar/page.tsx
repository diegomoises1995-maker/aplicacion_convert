import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUsuario } from "@/server/sesion";
import { puedeVerCliente } from "@/server/clientes";
import { Card, EncabezadoPagina } from "@/components/ui/card";
import { FormularioCliente } from "../../formulario-cliente";
import { datosFormularioCliente } from "../../datos-formulario";

export const metadata: Metadata = { title: "Editar cliente" };

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await requireUsuario();
  const cliente = await db.cliente.findUnique({ where: { id } });
  if (!cliente || !(await puedeVerCliente(usuario, cliente))) notFound();
  const datos = await datosFormularioCliente(usuario);
  return (
    <>
      <EncabezadoPagina titulo="Editar cliente" descripcion={cliente.razonSocial} />
      <Card>
        <FormularioCliente cliente={cliente} {...datos} />
      </Card>
    </>
  );
}
