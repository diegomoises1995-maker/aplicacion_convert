import type { Metadata } from "next";
import { Download } from "lucide-react";
import { db } from "@/lib/db";
import { getAlcance, requireUsuario } from "@/server/sesion";
import { calcularComisionMes } from "@/server/indicadores";
import { filtroEquipo } from "@/lib/alcance";
import { tienePermiso } from "@/lib/permisos";
import { etiquetaMes, partesLima } from "@/lib/fechas";
import type { LineaComision } from "@/lib/comisiones";
import { formatPorcentaje, formatSoles } from "@/lib/format";
import { Badge, Card, CardTitulo, EncabezadoPagina } from "@/components/ui/card";
import { Aviso } from "@/components/ui/varios";
import { SelectorPeriodo, leerPeriodo } from "@/components/metas/selector-periodo";
import { AccionesLiquidacion, BotonGenerar } from "./acciones";

export const metadata: Metadata = { title: "Comisiones" };

const ESTADO = { BORRADOR: { t: "Borrador", tono: "neutro" }, APROBADA: { t: "Aprobada", tono: "marca" }, PAGADA: { t: "Pagada", tono: "verde" } } as const;

function Detalle({ lineas }: { lineas: LineaComision[] }) {
  if (lineas.length === 0) return <p className="text-sm text-texto-suave">Sin comisiones en el período.</p>;
  return (
    <ul className="space-y-1 text-sm">
      {lineas.map((l, i) => (
        <li key={i} className="flex justify-between gap-2">
          <span>{l.regla} <span className="text-xs text-texto-suave">({l.base})</span></span>
          <span className="shrink-0 font-medium">{formatSoles(l.monto)}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function ComisionesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const usuario = await requireUsuario();
  const hoy = partesLima();
  const pp = leerPeriodo({ ...(await searchParams), periodo: "MENSUAL" }, hoy);
  const esMesActual = pp.anio === hoy.anio && pp.mes === hoy.mes;
  const liquida = tienePermiso(usuario.rol, "comisiones.liquidar");

  if (usuario.rol === "VENDEDOR") {
    const [calc, liquidacion, historial] = await Promise.all([
      calcularComisionMes(usuario.id, pp.anio, pp.mes),
      db.liquidacionComision.findUnique({ where: { vendedorId_anio_mes: { vendedorId: usuario.id, anio: pp.anio, mes: pp.mes } } }),
      db.liquidacionComision.findMany({ where: { vendedorId: usuario.id }, orderBy: [{ anio: "desc" }, { mes: "desc" }], take: 12 }),
    ]);
    const detalle = liquidacion ? (liquidacion.detalle as { lineas: LineaComision[] }).lineas : calc.lineas;
    return (
      <>
        <EncabezadoPagina titulo="Mis comisiones" />
        <SelectorPeriodo base="/comisiones" p={pp} trimestral={false} />
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <p className="text-sm text-texto-suave">{liquidacion ? "Liquidación" : esMesActual ? "Comisión proyectada a hoy" : "Comisión calculada"}</p>
            <p className="text-3xl font-semibold text-marca-700">{formatSoles(liquidacion ? liquidacion.total : calc.total)}</p>
            {liquidacion && <Badge tono={ESTADO[liquidacion.estado].tono}>{ESTADO[liquidacion.estado].t}</Badge>}
            <dl className="my-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div><dt className="text-texto-suave">Venta cobrada (sin IGV)</dt><dd className="font-medium">{formatSoles(calc.resultados.ventaCobrada)}</dd></div>
              <div><dt className="text-texto-suave">Cumplimiento de meta</dt><dd className="font-medium">{formatPorcentaje(calc.resultados.cumplimientoSoles)}</dd></div>
              <div><dt className="text-texto-suave">Clientes nuevos</dt><dd className="font-medium">{calc.resultados.clientesNuevos}</dd></div>
              <div><dt className="text-texto-suave">Reactivados</dt><dd className="font-medium">{calc.resultados.clientesReactivados}</dd></div>
            </dl>
            <Detalle lineas={detalle} />
          </Card>
          <Card>
            <CardTitulo>Historial</CardTitulo>
            <ul className="mt-2 divide-y divide-borde text-sm">
              {historial.map((h) => (
                <li key={h.id} className="flex justify-between py-2">
                  <span>{etiquetaMes(h.anio, h.mes)}</span>
                  <span>{formatSoles(h.total)} <Badge tono={ESTADO[h.estado].tono}>{ESTADO[h.estado].t}</Badge></span>
                </li>
              ))}
              {historial.length === 0 && <li className="py-2 text-texto-suave">Aún no hay liquidaciones.</li>}
            </ul>
          </Card>
        </div>
      </>
    );
  }

  const alcance = await getAlcance(usuario);
  const vendedores = await db.user.findMany({
    where: { ...filtroEquipo(alcance), rol: { in: ["VENDEDOR", "SUPERVISOR"] }, OR: [{ activo: true }, { pedidos: { some: {} } }] },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
  const liquidaciones = await db.liquidacionComision.findMany({
    where: { anio: pp.anio, mes: pp.mes, vendedorId: { in: vendedores.map((v) => v.id) } },
  });
  const filas = await Promise.all(
    vendedores.map(async (v) => {
      const l = liquidaciones.find((x) => x.vendedorId === v.id);
      const calc = l ? null : await calcularComisionMes(v.id, pp.anio, pp.mes);
      return { v, l, calc };
    }),
  );
  const visibles = filas.filter((f) => f.l || (f.calc && f.calc.total > 0));
  const total = visibles.reduce((s, f) => s + Number(f.l?.total ?? f.calc?.total ?? 0), 0);

  return (
    <>
      <EncabezadoPagina
        titulo="Comisiones"
        descripcion={`${etiquetaMes(pp.anio, pp.mes)} · total ${formatSoles(total)}`}
        acciones={
          <div className="flex flex-wrap gap-2">
            <a href={`/api/exportar/comisiones?anio=${pp.anio}&mes=${pp.mes}`} className="inline-flex h-11 items-center gap-2 rounded-lg border border-borde bg-superficie px-3 text-sm font-medium hover:bg-fondo">
              <Download className="size-4" aria-hidden /> Excel
            </a>
            {liquida && <BotonGenerar anio={pp.anio} mes={pp.mes} />}
          </div>
        }
      />
      <SelectorPeriodo base="/comisiones" p={pp} trimestral={false} />
      {esMesActual && <div className="mb-4"><Aviso>El mes está en curso: los montos sin liquidación son proyecciones con lo cobrado a hoy.</Aviso></div>}
      <div className="grid gap-3 lg:grid-cols-2">
        {visibles.map(({ v, l, calc }) => {
          const lineas = l ? (l.detalle as { lineas: LineaComision[] }).lineas : calc!.lineas;
          const r = l ? (l.detalle as { resultados: { ventaCobrada: number; cumplimientoSoles: number | null } }).resultados : calc!.resultados;
          return (
            <Card key={v.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{v.nombre}</p>
                  <p className="text-xs text-texto-suave">Cobrado {formatSoles(r.ventaCobrada)} · meta {formatPorcentaje(r.cumplimientoSoles)}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">{formatSoles(l?.total ?? calc!.total)}</p>
                  {l ? <Badge tono={ESTADO[l.estado].tono}>{ESTADO[l.estado].t}</Badge> : <Badge tono="amarillo">Proyección</Badge>}
                </div>
              </div>
              <div className="mt-3 border-t border-borde pt-3"><Detalle lineas={lineas} /></div>
              {l && liquida && <AccionesLiquidacion id={l.id} estado={l.estado} />}
            </Card>
          );
        })}
      </div>
      {visibles.length === 0 && <p className="text-sm text-texto-suave">Sin comisiones en el período.</p>}
    </>
  );
}
