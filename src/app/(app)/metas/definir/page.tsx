import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requirePermiso } from "@/server/sesion";
import { metasDelPeriodo, rangoPeriodo, ventasPorVendedor, sumarVentas, type Periodo } from "@/server/indicadores";
import { TIPOS_META } from "@/lib/metas";
import { partesLima, sumarMeses } from "@/lib/fechas";
import { EncabezadoPagina } from "@/components/ui/card";
import { SelectorPeriodo, etiquetaPeriodo, leerPeriodo } from "@/components/metas/selector-periodo";
import { FormularioMetas, type FilaMeta } from "./formulario";

export const metadata: Metadata = { title: "Definir metas" };

export default async function DefinirMetasPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requirePermiso("metas.definir");
  const pp = leerPeriodo(await searchParams, partesLima());
  const p: Periodo = pp.periodo === "MENSUAL" ? { periodo: "MENSUAL", anio: pp.anio, mes: pp.mes } : { periodo: "TRIMESTRAL", anio: pp.anio, trimestre: pp.trimestre };
  const [usuarios, metas] = await Promise.all([
    db.user.findMany({ where: { activo: true, rol: { in: ["VENDEDOR", "SUPERVISOR"] } }, select: { id: true, nombre: true, rol: true }, orderBy: { nombre: "asc" } }),
    metasDelPeriodo(p),
  ]);

  // Referencia: lo vendido en el mismo período anterior (mes o trimestre previo)
  const previo: Periodo = p.periodo === "MENSUAL"
    ? { periodo: "MENSUAL", ...sumarMeses(p.anio, p.mes!, -1) }
    : p.trimestre === 1 ? { periodo: "TRIMESTRAL", anio: p.anio - 1, trimestre: 4 } : { periodo: "TRIMESTRAL", anio: p.anio, trimestre: p.trimestre! - 1 };
  const r = rangoPeriodo(previo);
  const ventasPrevias = await ventasPorVendedor(r.inicio, r.fin);

  const filas: FilaMeta[] = [
    {
      clave: "x__-", titulo: "Empresa", subtitulo: "Meta general",
      valores: Object.fromEntries(TIPOS_META.map((t) => [t, metas.empresa(t)])),
      referencia: sumarVentas(ventasPrevias.values()).soles,
    },
    ...usuarios.filter((u) => u.rol === "SUPERVISOR").map((u) => ({
      clave: `e__${u.id}`, titulo: `Equipo de ${u.nombre}`, subtitulo: "Meta del equipo",
      valores: Object.fromEntries(TIPOS_META.map((t) => [t, metas.equipo(u.id, t)])),
      referencia: null,
    })),
    ...usuarios.filter((u) => u.rol === "VENDEDOR").map((u) => ({
      clave: `v__${u.id}`, titulo: u.nombre, subtitulo: "Vendedor",
      valores: Object.fromEntries(TIPOS_META.map((t) => [t, metas.individual(u.id, t)])),
      referencia: ventasPrevias.get(u.id)?.soles ?? 0,
    })),
  ];

  return (
    <>
      <EncabezadoPagina titulo="Definir metas" descripcion={`${etiquetaPeriodo(pp)} · deja vacío para quitar una meta`} />
      <SelectorPeriodo base="/metas/definir" p={pp} />
      <FormularioMetas
        key={`${p.periodo}-${p.anio}-${p.mes ?? p.trimestre}`}
        destino={{ periodo: p.periodo, anio: p.anio, mes: p.mes ?? null, trimestre: p.trimestre ?? null }}
        filas={filas}
        etiquetaReferencia={p.periodo === "MENSUAL" ? "vendido el mes anterior" : "vendido el trimestre anterior"}
      />
    </>
  );
}
