import type { Metadata } from "next";
import { Download } from "lucide-react";
import { getAlcance, requirePermiso } from "@/server/sesion";
import {
  leerRango, motivosPerdida, reporteActividades, reporteClientes, reporteModelos, reporteVendedores, reporteZonas,
} from "@/server/reportes";
import { NOMBRE_TIPO_ACTIVIDAD, type TipoActividad } from "@/lib/actividades";
import { formatNumero, formatPorcentaje, formatSoles } from "@/lib/format";
import { Card, CardTitulo, EncabezadoPagina } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BarrasHorizontales } from "@/components/graficos/barras";

export const metadata: Metadata = { title: "Reportes" };

function Excel({ tipo, qs }: { tipo: string; qs: string }) {
  return (
    <a href={`/api/exportar/reporte?tipo=${tipo}&${qs}`} className="inline-flex items-center gap-1 text-sm font-medium text-marca-700">
      <Download className="size-4" aria-hidden /> Excel
    </a>
  );
}

function Tabla({ cabeceras, filas }: { cabeceras: string[]; filas: (string | number)[][] }) {
  return (
    <div className="-mx-4 overflow-x-auto md:mx-0">
      <table className="w-full min-w-[32rem] text-sm">
        <thead className="text-xs text-texto-suave">
          <tr>{cabeceras.map((c, i) => <th key={c} className={`px-4 py-2 font-medium md:px-2 ${i === 0 ? "text-left" : "text-right"}`}>{c}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-borde">
          {filas.map((f, i) => (
            <tr key={i}>{f.map((v, j) => <td key={j} className={`px-4 py-2 md:px-2 ${j === 0 ? "text-left" : "text-right tabular-nums"}`}>{v}</td>)}</tr>
          ))}
          {filas.length === 0 && <tr><td colSpan={cabeceras.length} className="px-4 py-3 text-texto-suave md:px-2">Sin datos en el período.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export default async function ReportesPage({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  const usuario = await requirePermiso("reportes.gerencia");
  const rango = leerRango(await searchParams);
  const alcance = await getAlcance(usuario);
  const qs = `desde=${rango.desdeTexto}&hasta=${rango.hastaTexto}`;
  const [vendedores, clientes, modelos, zonas, actividades, motivos] = await Promise.all([
    reporteVendedores(alcance, rango),
    reporteClientes(alcance, rango),
    reporteModelos(alcance, rango),
    reporteZonas(alcance, rango),
    reporteActividades(alcance, rango),
    motivosPerdida(alcance, rango),
  ]);
  const total = vendedores.reduce((s, v) => s + v.soles, 0);
  const actPorVendedor = new Map<string, Record<string, number> & { total: number; exitosas: number }>();
  for (const a of actividades) {
    const x = actPorVendedor.get(a.vendedor) ?? ({ total: 0, exitosas: 0 } as Record<string, number> & { total: number; exitosas: number });
    x[a.tipo] = a.total;
    x.total += a.total;
    x.exitosas += a.exitosas;
    actPorVendedor.set(a.vendedor, x);
  }
  const tiposAct: TipoActividad[] = ["LLAMADA", "WHATSAPP", "VISITA", "REUNION"];

  return (
    <>
      <EncabezadoPagina titulo="Reportes" descripcion={`Ventas efectivas (pago verificado en adelante), valores sin IGV · total ${formatSoles(total)}`} />
      <form className="mb-4 flex flex-wrap items-end gap-2">
        <label className="text-sm">Desde<Input name="desde" type="date" defaultValue={rango.desdeTexto} className="mt-1 w-44" /></label>
        <label className="text-sm">Hasta<Input name="hasta" type="date" defaultValue={rango.hastaTexto} className="mt-1 w-44" /></label>
        <Button type="submit" variante="secundario">Aplicar</Button>
        <a href={`/api/exportar/pedidos?${qs}`} className="inline-flex h-11 items-center gap-2 rounded-lg border border-borde bg-superficie px-3 text-sm font-medium hover:bg-fondo">
          <Download className="size-4" aria-hidden /> Pedidos del período
        </a>
      </form>

      <div className="space-y-4">
        <Card>
          <div className="mb-3 flex items-center justify-between"><CardTitulo>Ventas por vendedor</CardTitulo><Excel tipo="vendedores" qs={qs} /></div>
          <Tabla
            cabeceras={["Vendedor", "Pedidos", "Clientes", "Nuevos", "Pares", "Ventas", "Ticket prom.", "% del total"]}
            filas={vendedores.map((v) => [v.vendedor, v.pedidos, v.clientes, v.nuevos, formatNumero(v.pares), formatSoles(v.soles), formatSoles(v.ticket), formatPorcentaje(total ? v.soles / total : null, 1)])}
          />
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <div className="mb-3 flex items-center justify-between"><CardTitulo>Ventas por zona</CardTitulo><Excel tipo="zonas" qs={qs} /></div>
            <BarrasHorizontales filas={zonas.map((z) => ({ etiqueta: z.zona, valor: z.soles, detalle: `${z.pedidos} pedidos · ${z.clientes} clientes` }))} formato={formatSoles} />
          </Card>
          <Card>
            <div className="mb-3 flex items-center justify-between"><CardTitulo>Motivos de pérdida</CardTitulo><Excel tipo="oportunidades" qs={qs} /></div>
            {motivos.length ? (
              <BarrasHorizontales filas={motivos.map((m) => ({ etiqueta: m.motivo, valor: m.cantidad, detalle: `${formatSoles(m.valor)} estimados` }))} formato={(v) => `${v} oportunidad${v === 1 ? "" : "es"}`} color="bg-stone-500" />
            ) : <p className="text-sm text-texto-suave">Sin oportunidades perdidas en el período.</p>}
          </Card>
        </div>

        <Card>
          <div className="mb-3 flex items-center justify-between"><CardTitulo>Modelos y colores más vendidos</CardTitulo><Excel tipo="modelos" qs={qs} /></div>
          <Tabla
            cabeceras={["Modelo", "Color", "Series", "Pares", "Clientes", "Ventas"]}
            filas={modelos.slice(0, 15).map((m) => [`${m.sku} · ${m.nombre}`, m.color, m.series, formatNumero(m.pares), m.clientes, formatSoles(m.soles)])}
          />
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between"><CardTitulo>Clientes con más compras</CardTitulo><Excel tipo="clientes" qs={qs} /></div>
          <Tabla
            cabeceras={["Cliente", "Ciudad", "Vendedor", "Cat.", "Pedidos", "Pares", "Ventas"]}
            filas={clientes.slice(0, 15).map((c) => [c.razon, c.ciudad, c.vendedor ?? "—", c.categoria, c.pedidos, formatNumero(c.pares), formatSoles(c.soles)])}
          />
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between"><CardTitulo>Actividad comercial</CardTitulo><Excel tipo="actividades" qs={qs} /></div>
          <Tabla
            cabeceras={["Vendedor", ...tiposAct.map((t) => NOMBRE_TIPO_ACTIVIDAD[t]), "Total", "Efectividad"]}
            filas={[...actPorVendedor.entries()].map(([v, x]) => [v, ...tiposAct.map((t) => x[t] ?? 0), x.total, formatPorcentaje(x.total ? x.exitosas / x.total : null)])}
          />
        </Card>
      </div>
    </>
  );
}
