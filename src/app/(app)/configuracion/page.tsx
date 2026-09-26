import type { Metadata } from "next";
import { requirePermiso } from "@/server/sesion";
import { getConfiguracion } from "@/server/configuracion";
import { Card, EncabezadoPagina } from "@/components/ui/card";
import { Pestanas } from "@/components/ui/varios";
import { PESTANAS_CONFIG } from "./pestanas";
import { FormularioConfiguracion } from "./formulario";
import { BotonTareas } from "./tareas";
import { db } from "@/lib/db";
import { formatFecha } from "@/lib/format";

export const metadata: Metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  await requirePermiso("configuracion.editar");
  const config = await getConfiguracion();
  const ultima = await db.auditLog.findFirst({ where: { accion: "sistema.tareas_diarias" }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <EncabezadoPagina titulo="Configuración" descripcion="Parámetros del negocio" />
      <Pestanas items={PESTANAS_CONFIG} actual="/configuracion" />
      <Card>
        <FormularioConfiguracion config={config} />
      </Card>
      <Card className="mt-4">
        <h2 className="font-semibold">Proceso diario</h2>
        <p className="mt-1 text-sm text-texto-suave">
          Recalcula estados y categorías de clientes, genera alertas de recompra y vence cotizaciones. Se ejecuta solo cada día a las 6:00 (Vercel Cron).
          {ultima && ` Última ejecución: ${formatFecha(ultima.createdAt, true)}.`}
        </p>
        <div className="mt-3"><BotonTareas /></div>
      </Card>
    </>
  );
}
