"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";
import { crearCotizacion } from "@/server/acciones/cotizaciones";
import { aprobacionRequerida, calcularTotales, validarPedidoMinimo, type Escala } from "@/lib/precios";
import type { Rol } from "@/lib/permisos";
import { formatSoles } from "@/lib/format";
import { Card, CardTitulo } from "@/components/ui/card";
import { Campo, Input } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/campos";
import { Button } from "@/components/ui/button";
import { Aviso } from "@/components/ui/varios";
import { FotoModelo } from "@/components/foto-modelo";

type Modelo = {
  id: string; sku: string; nombre: string; foto: string | null; precioBase: number; curva: string; paresPorSerie: number;
  colores: { id: string; nombre: string; hex: string | null; series: number }[];
};
type Linea = { modeloId: string; colorId: string; series: number };
type Precios = { lista: { id: string; nombre: string; ajuste: number } | null; escalas: Escala[]; preciosPorModelo: Record<string, number> };
type Config = {
  igvPorcentaje: number; pedidoMinimoSeries: number; pedidoMinimoMonto: number; pedidoMinimoCualquiera: boolean;
  descuentoMaxVendedor: number; descuentoMaxSupervisor: number;
};

export function Cotizador({
  rol, clientes, clienteId, oportunidades, oportunidadId, catalogo, precios, config, inicial,
}: {
  rol: Rol; clientes: { id: string; nombre: string }[]; clienteId: string | null; oportunidades: { id: string; titulo: string }[];
  oportunidadId: string | null; catalogo: Modelo[]; precios: Precios | null; config: Config;
  inicial: { lineas: Linea[]; descuento: number; notas: string | null } | null;
}) {
  const router = useRouter();
  const [lineas, setLineas] = useState<Linea[]>(inicial?.lineas ?? []);
  const [descuento, setDescuento] = useState(inicial?.descuento ?? 0);
  const [notas, setNotas] = useState(inicial?.notas ?? "");
  const [validez, setValidez] = useState(7);
  const [oportunidad, setOportunidad] = useState(oportunidadId ?? "");
  const [busqueda, setBusqueda] = useState("");
  const [modeloSel, setModeloSel] = useState("");
  const [colorSel, setColorSel] = useState("");
  const [seriesSel, setSeriesSel] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [guardando, startTransition] = useTransition();

  const porId = useMemo(() => new Map(catalogo.map((m) => [m.id, m])), [catalogo]);
  const filtrados = catalogo.filter((m) => `${m.sku} ${m.nombre}`.toLowerCase().includes(busqueda.toLowerCase()));
  const modelo = porId.get(modeloSel);

  const totales = useMemo(() => {
    if (!precios) return null;
    return calcularTotales({
      lineas: lineas.map((l) => {
        const m = porId.get(l.modeloId)!;
        return { ...l, paresPorSerie: m.paresPorSerie, precioBase: m.precioBase, precioLista: precios.preciosPorModelo[l.modeloId] ?? null };
      }),
      ajusteLista: precios.lista?.ajuste ?? 0,
      escalas: precios.escalas,
      descuentoManual: descuento,
      igvPorcentaje: config.igvPorcentaje,
    });
  }, [lineas, precios, descuento, config.igvPorcentaje, porId]);

  const aprobacion = aprobacionRequerida(rol, descuento, config);
  const errorMinimo = totales && lineas.length ? validarPedidoMinimo(totales.totalSeries, totales.baseImponible, config) : null;
  const siguienteEscala = precios?.escalas.find((e) => (totales?.totalSeries ?? 0) < e.desdeSeries);

  function agregar() {
    if (!modelo || !colorSel || seriesSel < 1) return;
    setLineas((ls) => {
      const i = ls.findIndex((l) => l.modeloId === modelo.id && l.colorId === colorSel);
      if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, series: l.series + seriesSel } : l));
      return [...ls, { modeloId: modelo.id, colorId: colorSel, series: seriesSel }];
    });
    setColorSel("");
    setSeriesSel(1);
  }

  function cambiarSeries(i: number, delta: number) {
    setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, series: Math.max(1, l.series + delta) } : l)));
  }

  function guardar() {
    if (!clienteId) return;
    setError(null);
    startTransition(async () => {
      const r = await crearCotizacion({
        clienteId, oportunidadId: oportunidad || null, lineas, descuentoManual: descuento, validezDias: validez, notas: notas || null,
      });
      if (r?.error) setError(r.error);
    });
  }

  return (
    <div className="grid gap-4 pb-40 lg:grid-cols-3 lg:pb-0">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <div className="grid gap-3 md:grid-cols-2">
            <Campo label="Cliente" htmlFor="cliente">
              <Select
                id="cliente"
                value={clienteId ?? ""}
                onChange={(e) => router.replace(`/cotizaciones/nueva?cliente=${e.target.value}`)}
              >
                <option value="" disabled>Elige un cliente</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </Select>
            </Campo>
            {oportunidades.length > 0 && (
              <Campo label="Oportunidad (opcional)" htmlFor="oportunidad">
                <Select id="oportunidad" value={oportunidad} onChange={(e) => setOportunidad(e.target.value)}>
                  <option value="">Ninguna</option>
                  {oportunidades.map((o) => <option key={o.id} value={o.id}>{o.titulo}</option>)}
                </Select>
              </Campo>
            )}
          </div>
          {precios && (
            <p className="mt-2 text-xs text-texto-suave">
              Lista: <strong>{precios.lista?.nombre ?? "Precio base"}</strong>
              {precios.escalas.length > 0 && <> · Volumen: {precios.escalas.map((e) => `${e.desdeSeries}+ series −${e.descuentoPorcentaje} %`).join(", ")}</>}
            </p>
          )}
        </Card>

        {clienteId && (
          <Card>
            <CardTitulo className="mb-3">Agregar modelo</CardTitulo>
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Buscar por nombre o SKU…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              <Select value={modeloSel} onChange={(e) => { setModeloSel(e.target.value); setColorSel(""); }} aria-label="Modelo">
                <option value="">Elige un modelo ({filtrados.length})</option>
                {filtrados.map((m) => <option key={m.id} value={m.id}>{m.sku} · {m.nombre}</option>)}
              </Select>
            </div>
            {modelo && (
              <div className="mt-3 flex flex-col gap-3 rounded-lg bg-fondo p-3 sm:flex-row">
                <FotoModelo src={modelo.foto} alt={modelo.nombre} className="h-24 w-32 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm">
                    <strong>{modelo.nombre}</strong> · serie de {modelo.paresPorSerie} pares ({modelo.curva}) ·{" "}
                    {formatSoles(precios?.preciosPorModelo[modelo.id] ?? modelo.precioBase * (1 + (precios?.lista?.ajuste ?? 0) / 100))} / par
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {modelo.colores.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setColorSel(c.id)}
                        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${colorSel === c.id ? "border-marca-700 bg-marca-50" : "border-borde bg-superficie"}`}
                      >
                        <span className="size-3 rounded-full border border-borde" style={{ background: c.hex ?? "#ccc" }} />
                        {c.nombre}
                        <span className={`text-xs ${c.series ? "text-texto-suave" : "text-red-600"}`}>({c.series} disp.)</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Contador valor={seriesSel} onCambio={setSeriesSel} />
                    <span className="text-sm text-texto-suave">series</span>
                    <Button type="button" tamano="sm" onClick={agregar} disabled={!colorSel}>Agregar</Button>
                  </div>
                  {colorSel && seriesSel > (modelo.colores.find((c) => c.id === colorSel)?.series ?? 0) && (
                    <p className="text-xs text-amber-700">Stock actual insuficiente: el pedido podría demorar hasta reponer.</p>
                  )}
                </div>
              </div>
            )}
          </Card>
        )}

        {lineas.length > 0 && totales && (
          <Card className="p-0 md:p-0">
            <ul className="divide-y divide-borde">
              {totales.lineas.map((l, i) => {
                const m = porId.get(l.modeloId)!;
                const c = m.colores.find((x) => x.id === l.colorId);
                return (
                  <li key={`${l.modeloId}-${l.colorId}`} className="flex items-center gap-3 p-3">
                    <FotoModelo src={m.foto} alt={m.nombre} className="size-14 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{m.nombre} · {c?.nombre}</p>
                      <p className="text-xs text-texto-suave">{l.pares} pares × {formatSoles(l.precioPar)} = <strong>{formatSoles(l.subtotal)}</strong></p>
                    </div>
                    <Contador valor={l.series} onCambio={(v) => cambiarSeries(i, v - l.series)} />
                    <button type="button" onClick={() => setLineas((ls) => ls.filter((_, j) => j !== i))} aria-label="Quitar" className="grid size-9 place-items-center rounded-full text-red-600 hover:bg-red-50">
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        {clienteId && (
          <Card className="grid gap-3 md:grid-cols-3">
            <Campo label="Descuento adicional (%)" htmlFor="descuento">
              <Input id="descuento" type="number" min={0} max={90} step="0.5" inputMode="decimal" value={descuento} onChange={(e) => setDescuento(Math.max(0, Number(e.target.value) || 0))} />
            </Campo>
            <Campo label="Validez (días)" htmlFor="validez">
              <Input id="validez" type="number" min={1} max={60} value={validez} onChange={(e) => setValidez(Number(e.target.value) || 7)} />
            </Campo>
            <div className="md:col-span-3">
              <Campo label="Notas / condiciones" htmlFor="notas">
                <Textarea id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej. Entrega en 3 días hábiles tras el pago" />
              </Campo>
            </div>
            {aprobacion && (
              <div className="md:col-span-3">
                <Aviso tono="alerta">
                  Un descuento de {descuento} % requiere aprobación {aprobacion === "SUPERVISOR" ? "del supervisor" : "del gerente"}. La cotización quedará pendiente hasta que se apruebe.
                </Aviso>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Resumen: barra fija abajo en celular, columna lateral en escritorio */}
      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-borde bg-superficie p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] md:bottom-0 md:left-60 lg:static lg:rounded-xl lg:border lg:shadow-sm">
        <div className="mx-auto max-w-6xl lg:sticky lg:top-6">
          <CardTitulo className="hidden lg:block">Resumen</CardTitulo>
          {totales && (
            <dl className="grid grid-cols-2 gap-x-3 text-sm lg:mt-3 lg:grid-cols-1 lg:gap-y-1">
              <div className="hidden justify-between lg:flex"><dt>Subtotal ({totales.totalSeries} series · {totales.totalPares} pares)</dt><dd>{formatSoles(totales.subtotal)}</dd></div>
              {totales.descuentoVolumen > 0 && <div className="hidden justify-between text-emerald-700 lg:flex"><dt>Volumen −{totales.pctVolumen} %</dt><dd>−{formatSoles(totales.descuentoVolumen)}</dd></div>}
              {totales.descuentoManualMonto > 0 && <div className="hidden justify-between text-emerald-700 lg:flex"><dt>Descuento −{descuento} %</dt><dd>−{formatSoles(totales.descuentoManualMonto)}</dd></div>}
              <div className="flex justify-between"><dt className="text-texto-suave">Base</dt><dd>{formatSoles(totales.baseImponible)}</dd></div>
              <div className="flex justify-between"><dt className="text-texto-suave">IGV {config.igvPorcentaje} %</dt><dd>{formatSoles(totales.igv)}</dd></div>
              <div className="col-span-2 mt-1 flex justify-between text-lg font-semibold lg:col-span-1"><dt>Total</dt><dd>{formatSoles(totales.total)}</dd></div>
            </dl>
          )}
          {siguienteEscala && totales && lineas.length > 0 && (
            <p className="mt-1 text-xs text-emerald-700">
              Con {siguienteEscala.desdeSeries - totales.totalSeries} serie(s) más obtiene −{siguienteEscala.descuentoPorcentaje} %.
            </p>
          )}
          {errorMinimo && <p className="mt-1 text-xs text-amber-700">{errorMinimo}</p>}
          {error && <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Button className="mt-3 w-full" onClick={guardar} disabled={!clienteId || lineas.length === 0 || !!errorMinimo || guardando}>
            {guardando ? "Guardando…" : aprobacion ? "Enviar a aprobación" : "Guardar cotización"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Contador({ valor, onCambio }: { valor: number; onCambio: (v: number) => void }) {
  return (
    <div className="flex items-center rounded-lg border border-borde bg-superficie">
      <button type="button" aria-label="Menos" className="grid size-9 place-items-center" onClick={() => onCambio(Math.max(1, valor - 1))}><Minus className="size-4" /></button>
      <input
        aria-label="Series"
        type="number"
        min={1}
        inputMode="numeric"
        value={valor}
        onChange={(e) => onCambio(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
        className="h-9 w-12 border-x border-borde text-center text-base md:text-sm"
      />
      <button type="button" aria-label="Más" className="grid size-9 place-items-center" onClick={() => onCambio(valor + 1)}><Plus className="size-4" /></button>
    </div>
  );
}
