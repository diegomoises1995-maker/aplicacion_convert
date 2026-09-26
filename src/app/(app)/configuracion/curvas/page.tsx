import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requirePermiso } from "@/server/sesion";
import { NOMBRE_GENERO, textoCurva } from "@/lib/catalogo";
import type { Distribucion } from "@/lib/stock";
import { Card, CardTitulo, EncabezadoPagina } from "@/components/ui/card";
import { Pestanas } from "@/components/ui/varios";
import { PESTANAS_CONFIG } from "../pestanas";
import { FormularioCurva } from "./formulario";

export const metadata: Metadata = { title: "Curvas de tallas" };

export default async function CurvasPage() {
  await requirePermiso("catalogo.gestionar");
  const curvas = await db.curvaTallas.findMany({ include: { _count: { select: { modelos: true } } }, orderBy: { nombre: "asc" } });
  return (
    <>
      <EncabezadoPagina titulo="Configuración" descripcion="Curvas de tallas: cuántos pares de cada talla trae una serie" />
      <Pestanas items={PESTANAS_CONFIG} actual="/configuracion/curvas" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-0 md:p-0 lg:col-span-2">
          <ul className="divide-y divide-borde">
            {curvas.map((c) => (
              <li key={c.id} className="p-4">
                <p className="font-medium">{c.nombre} <span className="text-sm font-normal text-texto-suave">· {NOMBRE_GENERO[c.genero]} · {c.paresPorSerie} pares · {c._count.modelos} modelos</span></p>
                <p className="mt-1 font-mono text-sm text-texto-suave">{textoCurva(c.distribucion as Distribucion)}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardTitulo className="mb-3">Nueva curva</CardTitulo>
          <FormularioCurva />
        </Card>
      </div>
    </>
  );
}
