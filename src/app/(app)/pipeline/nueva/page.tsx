import type { Metadata } from "next";
import { requireUsuario } from "@/server/sesion";
import { Card, EncabezadoPagina } from "@/components/ui/card";
import { FormularioOportunidad } from "../formulario-oportunidad";
import { opcionesClientes } from "../clientes-opciones";

export const metadata: Metadata = { title: "Nueva oportunidad" };

export default async function NuevaOportunidadPage({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const usuario = await requireUsuario();
  const { cliente } = await searchParams;
  return (
    <>
      <EncabezadoPagina titulo="Nueva oportunidad" />
      <Card>
        <FormularioOportunidad clientes={await opcionesClientes(usuario)} clienteInicial={cliente} />
      </Card>
    </>
  );
}
