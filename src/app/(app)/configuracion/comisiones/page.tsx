import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requirePermiso } from "@/server/sesion";
import { alternarRegla } from "@/server/acciones/comisiones";
import { NOMBRE_TIPO_REGLA } from "@/lib/comisiones";
import { formatFecha, formatSoles } from "@/lib/format";
import { Badge, Card, CardTitulo, EncabezadoPagina } from "@/components/ui/card";
import { Pestanas } from "@/components/ui/varios";
import { Button } from "@/components/ui/button";
import { PESTANAS_CONFIG } from "../pestanas";
import { FormularioRegla } from "./formulario";

export const metadata: Metadata = { title: "Reglas de comisión" };

export default async function ReglasPage() {
  await requirePermiso("comisiones.configurar");
  const reglas = await db.reglaComision.findMany({ orderBy: [{ activa: "desc" }, { tipo: "asc" }, { umbralCumplimiento: "asc" }] });
  return (
    <>
      <EncabezadoPagina titulo="Configuración" descripcion="Reglas de comisión" />
      <Pestanas items={PESTANAS_CONFIG} actual="/configuracion/comisiones" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-0 md:p-0 lg:col-span-2">
          <ul className="divide-y divide-borde">
            {reglas.map((r) => (
              <li key={r.id} className={`flex flex-wrap items-center gap-3 p-4 ${r.activa ? "" : "opacity-60"}`}>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{r.nombre} {!r.activa && <Badge tono="rojo">Inactiva</Badge>}</p>
                  <p className="text-sm text-texto-suave">
                    {NOMBRE_TIPO_REGLA[r.tipo]}: {r.tipo === "PORCENTAJE_VENTA_COBRADA" ? `${String(r.valor)} %` : formatSoles(r.valor)}
                    {r.umbralCumplimiento && ` desde ${String(r.umbralCumplimiento)} % de la meta`} · vigente desde {formatFecha(r.vigenteDesde)}
                    {r.vigenteHasta && ` hasta ${formatFecha(r.vigenteHasta)}`}
                  </p>
                </div>
                <form action={alternarRegla.bind(null, r.id)}>
                  <Button variante="fantasma" tamano="sm">{r.activa ? "Desactivar" : "Reactivar"}</Button>
                </form>
              </li>
            ))}
            {reglas.length === 0 && <li className="p-4 text-sm text-texto-suave">Aún no hay reglas.</li>}
          </ul>
        </Card>
        <Card>
          <CardTitulo className="mb-1">Nueva regla</CardTitulo>
          <p className="mb-3 text-xs text-texto-suave">Los bonos por meta son escalonados: se paga solo el tramo más alto alcanzado.</p>
          <FormularioRegla />
        </Card>
      </div>
    </>
  );
}
