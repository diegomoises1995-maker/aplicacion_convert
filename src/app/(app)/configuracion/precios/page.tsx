import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requirePermiso } from "@/server/sesion";
import { eliminarEscala } from "@/server/acciones/precios";
import { NOMBRE_TIPO_CLIENTE } from "@/lib/clientes";
import { formatSoles } from "@/lib/format";
import { Badge, Card, CardTitulo, EncabezadoPagina } from "@/components/ui/card";
import { Pestanas } from "@/components/ui/varios";
import { Button } from "@/components/ui/button";
import { PESTANAS_CONFIG } from "../pestanas";
import { FormularioEscala, FormularioLista, FormularioPrecioModelo } from "./formularios";

export const metadata: Metadata = { title: "Precios" };

export default async function PreciosPage() {
  await requirePermiso("precios.gestionar");
  const [listas, generales, modelos] = await Promise.all([
    db.listaPrecio.findMany({
      include: {
        escalas: { orderBy: { desdeSeries: "asc" } },
        precios: { include: { modelo: { select: { sku: true, nombre: true, precioBase: true } } } },
        _count: { select: { clientes: true } },
      },
      orderBy: { nombre: "asc" },
    }),
    db.escalaPrecio.findMany({ where: { listaId: null }, orderBy: { desdeSeries: "asc" } }),
    db.modelo.findMany({ where: { activo: true }, select: { id: true, sku: true, nombre: true }, orderBy: { nombre: "asc" } }),
  ]);

  const Escalas = ({ escalas }: { escalas: { id: string; desdeSeries: number; descuentoPorcentaje: unknown }[] }) => (
    <ul className="mt-2 space-y-1 text-sm">
      {escalas.map((e) => (
        <li key={e.id} className="flex items-center justify-between rounded-lg bg-fondo px-3 py-1.5">
          <span>Desde {e.desdeSeries} series: <strong>−{String(e.descuentoPorcentaje)} %</strong></span>
          <form action={eliminarEscala.bind(null, e.id)}><Button variante="fantasma" tamano="sm">Quitar</Button></form>
        </li>
      ))}
      {escalas.length === 0 && <li className="text-texto-suave">Sin escalas.</li>}
    </ul>
  );

  return (
    <>
      <EncabezadoPagina titulo="Configuración" descripcion="Listas de precios por tipo de cliente y descuentos por volumen" />
      <Pestanas items={PESTANAS_CONFIG} actual="/configuracion/precios" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardTitulo>Escalas generales por volumen</CardTitulo>
            <p className="text-sm text-texto-suave">Se aplican cuando la lista del cliente no tiene escalas propias.</p>
            <Escalas escalas={generales} />
            <div className="mt-3"><FormularioEscala listaId={null} /></div>
          </Card>
          {listas.map((l) => (
            <Card key={l.id} className={l.activa ? "" : "opacity-70"}>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitulo>{l.nombre}</CardTitulo>
                {l.tipoCliente && <Badge tono="marca">{NOMBRE_TIPO_CLIENTE[l.tipoCliente]}</Badge>}
                <Badge>{Number(l.ajustePorcentaje) === 0 ? "Precio base" : `${Number(l.ajustePorcentaje) > 0 ? "+" : ""}${String(l.ajustePorcentaje)} % sobre base`}</Badge>
                <Badge>{l._count.clientes} clientes asignados</Badge>
                {!l.activa && <Badge tono="rojo">Inactiva</Badge>}
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-marca-700">Editar lista</summary>
                <div className="mt-3"><FormularioLista lista={{ ...l, ajustePorcentaje: Number(l.ajustePorcentaje) }} /></div>
              </details>
              <h3 className="mt-4 text-sm font-semibold">Escalas propias</h3>
              <Escalas escalas={l.escalas} />
              <div className="mt-2"><FormularioEscala listaId={l.id} /></div>
              <h3 className="mt-4 text-sm font-semibold">Precios específicos por modelo</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {l.precios.map((p) => (
                  <li key={p.id} className="flex justify-between rounded-lg bg-fondo px-3 py-1.5">
                    <span>{p.modelo.sku} · {p.modelo.nombre}</span>
                    <span>{formatSoles(p.precio)} <span className="text-xs text-texto-suave">(base {formatSoles(p.modelo.precioBase)})</span></span>
                  </li>
                ))}
                {l.precios.length === 0 && <li className="text-texto-suave">Ninguno: se usa el ajuste de la lista.</li>}
              </ul>
              <div className="mt-2"><FormularioPrecioModelo listaId={l.id} modelos={modelos} /></div>
            </Card>
          ))}
        </div>
        <Card>
          <CardTitulo className="mb-3">Nueva lista de precios</CardTitulo>
          <FormularioLista />
        </Card>
      </div>
    </>
  );
}
