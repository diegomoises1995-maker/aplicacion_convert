import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requirePermiso } from "@/server/sesion";
import { alternarZona } from "@/server/acciones/configuracion";
import { Badge, Card, CardTitulo, EncabezadoPagina } from "@/components/ui/card";
import { Pestanas } from "@/components/ui/varios";
import { Button } from "@/components/ui/button";
import { PESTANAS_CONFIG } from "../pestanas";
import { FormularioZona } from "./formulario";

export const metadata: Metadata = { title: "Zonas" };

export default async function ZonasPage() {
  await requirePermiso("zonas.gestionar");
  const zonas = await db.zona.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { usuarios: true, clientes: true } } },
  });
  return (
    <>
      <EncabezadoPagina titulo="Configuración" descripcion="Zonas y territorios" />
      <Pestanas items={PESTANAS_CONFIG} actual="/configuracion/zonas" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-0 md:p-0 lg:col-span-2">
          <ul className="divide-y divide-borde">
            {zonas.map((z) => (
              <li key={z.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {z.nombre} {!z.activa && <Badge tono="rojo">Inactiva</Badge>}
                  </p>
                  <p className="text-sm text-texto-suave">
                    {z._count.usuarios} vendedores · {z._count.clientes} clientes{z.descripcion ? ` · ${z.descripcion}` : ""}
                  </p>
                </div>
                <FormularioZona zona={z} />
                <form action={alternarZona.bind(null, z.id)}>
                  <Button variante="fantasma" tamano="sm">{z.activa ? "Desactivar" : "Activar"}</Button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardTitulo className="mb-3">Nueva zona</CardTitulo>
          <FormularioZona />
        </Card>
      </div>
    </>
  );
}
