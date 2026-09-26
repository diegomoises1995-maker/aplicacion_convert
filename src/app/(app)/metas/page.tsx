import type { Metadata } from "next";
import { Pencil } from "lucide-react";
import { db } from "@/lib/db";
import { getAlcance, requireUsuario } from "@/server/sesion";
import {
  fraccionPeriodo, indicadoresMeta, metasDelPeriodo, rangoPeriodo, sumarVentas, ventasPorVendedor, type Periodo,
} from "@/server/indicadores";
import { filtroEquipo } from "@/lib/alcance";
import { tienePermiso } from "@/lib/permisos";
import { partesLima, sumarMeses } from "@/lib/fechas";
import { variacion, type TipoMeta } from "@/lib/metas";
import { formatNumero, formatPorcentaje, formatSoles } from "@/lib/format";
import { Card, CardTitulo, EncabezadoPagina } from "@/components/ui/card";
import { BotonLink, Vacio } from "@/components/ui/varios";
import { BadgeSemaforo, BarraAvance, Variacion } from "@/components/metas/avance";
import { SelectorPeriodo, leerPeriodo } from "@/components/metas/selector-periodo";

export const metadata: Metadata = { title: "Metas" };

function periodoDesplazado(p: Periodo, meses: number): Periodo {
  if (p.periodo === "MENSUAL") return { periodo: "MENSUAL", ...sumarMeses(p.anio, p.mes!, meses) };
  const total = p.anio * 4 + (p.trimestre! - 1) + meses / 3;
  return { periodo: "TRIMESTRAL", anio: Math.floor(total / 4), trimestre: (total % 4) + 1 };
}

export default async function MetasPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const usuario = await requireUsuario();
  const pp = leerPeriodo(await searchParams, partesLima());
  const p: Periodo = pp.periodo === "MENSUAL" ? { periodo: "MENSUAL", anio: pp.anio, mes: pp.mes } : { periodo: "TRIMESTRAL", anio: pp.anio, trimestre: pp.trimestre };
  const alcance = await getAlcance(usuario);
  const esVendedor = usuario.rol === "VENDEDOR";

  // Para el ranking, el vendedor ve a todo su equipo (solo % de cumplimiento).
  const equipo = await db.user.findMany({
    where: {
      rol: "VENDEDOR",
      ...(esVendedor ? (usuario.supervisorId ? { supervisorId: usuario.supervisorId } : { id: usuario.id }) : filtroEquipo(alcance)),
    },
    select: { id: true, nombre: true, activo: true, supervisorId: true },
    orderBy: { nombre: "asc" },
  });
  const ids = equipo.map((u) => u.id);
  const { inicio, fin } = rangoPeriodo(p);
  const anterior = rangoPeriodo(periodoDesplazado(p, p.periodo === "MENSUAL" ? -1 : -3));
  const anioPasado = rangoPeriodo(periodoDesplazado(p, -12));
  const [ventas, ventasAnt, ventasAA, metas] = await Promise.all([
    ventasPorVendedor(inicio, fin, ids),
    ventasPorVendedor(anterior.inicio, anterior.fin, ids),
    ventasPorVendedor(anioPasado.inicio, anioPasado.fin, ids),
    metasDelPeriodo(p),
  ]);
  const fraccion = fraccionPeriodo(p);

  const filas = await Promise.all(
    equipo
      .filter((u) => u.activo || ventas.has(u.id))
      .map(async (u) => ({
        u,
        ind: await indicadoresMeta(ventas.get(u.id), (t: TipoMeta) => metas.individual(u.id, t), fraccion),
        vsAnterior: variacion(ventas.get(u.id)?.soles ?? 0, ventasAnt.get(u.id)?.soles ?? 0),
        vsAnioPasado: variacion(ventas.get(u.id)?.soles ?? 0, ventasAA.get(u.id)?.soles ?? 0),
      })),
  );
  const ranking = [...filas].sort((a, b) => (b.ind[0]!.cumplimiento ?? -1) - (a.ind[0]!.cumplimiento ?? -1) || b.ind[0]!.real - a.ind[0]!.real);

  // Resumen: el propio vendedor, el equipo del supervisor o la empresa.
  const total = sumarVentas(ventas.values());
  const resumen = esVendedor
    ? { titulo: "Tu avance", ind: filas.find((f) => f.u.id === usuario.id)?.ind ?? [] }
    : usuario.rol === "SUPERVISOR"
      ? { titulo: "Tu equipo", ind: await indicadoresMeta(total, (t) => metas.equipo(usuario.id, t) ?? sumaMetas(t), fraccion) }
      : { titulo: "Empresa", ind: await indicadoresMeta(total, (t) => metas.empresa(t) ?? sumaMetas(t), fraccion) };
  function sumaMetas(t: TipoMeta) {
    const valores = filas.map((f) => metas.individual(f.u.id, t)).filter((v): v is number => v !== null);
    return valores.length ? valores.reduce((a, b) => a + b, 0) : null;
  }
  const totalAnt = sumarVentas(ventasAnt.values());
  const totalAA = sumarVentas(ventasAA.values());

  return (
    <>
      <EncabezadoPagina
        titulo="Metas y desempeño"
        descripcion={fraccion < 1 && fraccion > 0 ? `Transcurrido: ${formatPorcentaje(fraccion)} del período` : undefined}
        acciones={
          tienePermiso(usuario.rol, "metas.definir") && (
            <BotonLink href={`/metas/definir?${new URLSearchParams(p.periodo === "MENSUAL" ? { periodo: p.periodo, anio: String(p.anio), mes: String(p.mes) } : { periodo: p.periodo, anio: String(p.anio), trimestre: String(p.trimestre) })}`} variante="secundario">
              <Pencil className="size-4" aria-hidden /> Definir metas
            </BotonLink>
          )
        }
      />
      <SelectorPeriodo base="/metas" p={pp} />

      <Card className="mb-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <CardTitulo>{resumen.titulo}</CardTitulo>
          {!esVendedor && (
            <p className="text-sm text-texto-suave">
              vs período anterior <Variacion v={variacion(total.soles, totalAnt.soles)} /> · vs año pasado <Variacion v={variacion(total.soles, totalAA.soles)} />
            </p>
          )}
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {resumen.ind.map((i) => <BarraAvance key={i.tipo} {...i} fraccion={fraccion} />)}
        </div>
      </Card>

      {ranking.length === 0 ? (
        <Vacio titulo="No hay vendedores en tu alcance" />
      ) : (
        <Card className="p-0 md:p-0">
          <CardTitulo className="border-b border-borde px-4 py-3">Ranking de vendedores</CardTitulo>
          <ol className="divide-y divide-borde">
            {ranking.map((f, n) => {
              const [soles, pares, nuevos, reactivados] = f.ind as [typeof f.ind[0], typeof f.ind[0], typeof f.ind[0], typeof f.ind[0]];
              const verDetalle = !esVendedor || f.u.id === usuario.id;
              return (
                <li key={f.u.id} className={`p-3 md:px-4 ${f.u.id === usuario.id ? "bg-marca-50/50" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${n === 0 ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-600"}`}>{n + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{f.u.nombre}</span>
                        <BadgeSemaforo s={soles.semaforo} />
                      </div>
                      {verDetalle ? (
                        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <BarraAvance {...soles} fraccion={fraccion} compacta />
                          <BarraAvance {...pares} fraccion={fraccion} compacta />
                          <p className="text-sm"><span className="text-texto-suave">Nuevos:</span> {nuevos.real}{nuevos.meta !== null && ` / ${formatNumero(nuevos.meta)}`} · <span className="text-texto-suave">Reactivados:</span> {reactivados.real}{reactivados.meta !== null && ` / ${formatNumero(reactivados.meta)}`}</p>
                          <p className="text-sm"><span className="text-texto-suave">vs anterior</span> <Variacion v={f.vsAnterior} /> · <span className="text-texto-suave">vs año pasado</span> <Variacion v={f.vsAnioPasado} /></p>
                        </div>
                      ) : (
                        <p className="text-sm text-texto-suave">Cumplimiento: {formatPorcentaje(soles.cumplimiento)}</p>
                      )}
                    </div>
                    {verDetalle && <span className="hidden text-right text-sm font-semibold md:block">{formatSoles(soles.real)}</span>}
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      )}
    </>
  );
}
