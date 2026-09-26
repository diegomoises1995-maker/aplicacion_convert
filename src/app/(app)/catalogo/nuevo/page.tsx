import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermiso } from "@/server/sesion";
import { Card, EncabezadoPagina } from "@/components/ui/card";
import { FormularioModelo } from "../formulario-modelo";

export const metadata: Metadata = { title: "Nuevo modelo" };

export default async function NuevoModeloPage() {
  await requirePermiso("catalogo.gestionar");
  const curvas = await db.curvaTallas.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } });
  return (
    <>
      <EncabezadoPagina titulo="Nuevo modelo" descripcion="Luego podrás agregar colores y stock por talla" />
      <Card>
        {curvas.length === 0 ? (
          <p className="text-sm">Primero crea una <Link className="text-marca-700 underline" href="/configuracion/curvas">curva de tallas</Link>.</p>
        ) : (
          <FormularioModelo curvas={curvas} />
        )}
      </Card>
    </>
  );
}
