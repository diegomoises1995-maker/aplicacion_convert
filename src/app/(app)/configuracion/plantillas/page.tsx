import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requirePermiso } from "@/server/sesion";
import { alternarPlantilla } from "@/server/acciones/plantillas";
import { Badge, Card, CardTitulo, EncabezadoPagina } from "@/components/ui/card";
import { Pestanas } from "@/components/ui/varios";
import { Button } from "@/components/ui/button";
import { PESTANAS_CONFIG } from "../pestanas";
import { FormularioPlantilla } from "./formulario";

export const metadata: Metadata = { title: "Plantillas de WhatsApp" };

export default async function PlantillasPage() {
  await requirePermiso("configuracion.editar");
  const plantillas = await db.plantillaWhatsApp.findMany({ orderBy: { nombre: "asc" } });
  return (
    <>
      <EncabezadoPagina titulo="Configuración" descripcion="Plantillas de mensajes de WhatsApp" />
      <Pestanas items={PESTANAS_CONFIG} actual="/configuracion/plantillas" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {plantillas.map((p) => (
            <Card key={p.id} className={p.activa ? "" : "opacity-60"}>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-medium">{p.nombre} {!p.activa && <Badge tono="rojo">Inactiva</Badge>}</p>
                <form action={alternarPlantilla.bind(null, p.id)}>
                  <Button variante="fantasma" tamano="sm">{p.activa ? "Desactivar" : "Activar"}</Button>
                </form>
              </div>
              <FormularioPlantilla plantilla={p} />
            </Card>
          ))}
        </div>
        <Card>
          <CardTitulo className="mb-1">Nueva plantilla</CardTitulo>
          <p className="mb-3 text-xs text-texto-suave">Variables: {"{cliente}"}, {"{contacto}"}, {"{vendedor}"}, {"{empresa}"}</p>
          <FormularioPlantilla />
        </Card>
      </div>
    </>
  );
}
