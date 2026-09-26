import type { Metadata } from "next";
import { requirePermiso } from "@/server/sesion";
import { getConfiguracion } from "@/server/configuracion";
import { Card, EncabezadoPagina } from "@/components/ui/card";
import { Pestanas } from "@/components/ui/varios";
import { PESTANAS_CONFIG } from "./pestanas";
import { FormularioConfiguracion } from "./formulario";

export const metadata: Metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  await requirePermiso("configuracion.editar");
  const config = await getConfiguracion();
  return (
    <>
      <EncabezadoPagina titulo="Configuración" descripcion="Parámetros del negocio" />
      <Pestanas items={PESTANAS_CONFIG} actual="/configuracion" />
      <Card>
        <FormularioConfiguracion config={config} />
      </Card>
    </>
  );
}
