import type { Metadata } from "next";
import { requireUsuario } from "@/server/sesion";
import { Card, EncabezadoPagina } from "@/components/ui/card";
import { FormularioCliente } from "../formulario-cliente";
import { datosFormularioCliente } from "../datos-formulario";

export const metadata: Metadata = { title: "Nuevo cliente" };

export default async function NuevoClientePage() {
  const usuario = await requireUsuario();
  const datos = await datosFormularioCliente(usuario);
  return (
    <>
      <EncabezadoPagina titulo="Nuevo cliente" />
      <Card>
        <FormularioCliente {...datos} vendedorDefecto={usuario.rol === "ADMIN" ? undefined : usuario.id} />
      </Card>
    </>
  );
}
