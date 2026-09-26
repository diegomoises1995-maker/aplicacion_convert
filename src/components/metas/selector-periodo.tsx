import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { etiquetaMes, sumarMeses } from "@/lib/fechas";

export type ParamsPeriodo = { periodo: "MENSUAL" | "TRIMESTRAL"; anio: number; mes: number; trimestre: number };

export function leerPeriodo(sp: { anio?: string; mes?: string; trimestre?: string; periodo?: string }, hoy: { anio: number; mes: number }): ParamsPeriodo {
  const anio = Number(sp.anio) || hoy.anio;
  const mes = Math.min(12, Math.max(1, Number(sp.mes) || hoy.mes));
  const trimestre = Math.min(4, Math.max(1, Number(sp.trimestre) || Math.ceil(mes / 3)));
  return { periodo: sp.periodo === "TRIMESTRAL" ? "TRIMESTRAL" : "MENSUAL", anio, mes, trimestre };
}

export function etiquetaPeriodo(p: ParamsPeriodo) {
  return p.periodo === "MENSUAL" ? etiquetaMes(p.anio, p.mes) : `T${p.trimestre} ${p.anio}`;
}

export function SelectorPeriodo({ base, p, trimestral = true }: { base: string; p: ParamsPeriodo; trimestral?: boolean }) {
  const url = (x: Partial<ParamsPeriodo>) => {
    const q = { ...p, ...x };
    return `${base}?${new URLSearchParams(
      q.periodo === "MENSUAL" ? { periodo: q.periodo, anio: String(q.anio), mes: String(q.mes) } : { periodo: q.periodo, anio: String(q.anio), trimestre: String(q.trimestre) },
    )}`;
  };
  const prev = p.periodo === "MENSUAL" ? sumarMeses(p.anio, p.mes, -1) : null;
  const next = p.periodo === "MENSUAL" ? sumarMeses(p.anio, p.mes, 1) : null;
  const tPrev = p.trimestre === 1 ? { anio: p.anio - 1, trimestre: 4 } : { anio: p.anio, trimestre: p.trimestre - 1 };
  const tNext = p.trimestre === 4 ? { anio: p.anio + 1, trimestre: 1 } : { anio: p.anio, trimestre: p.trimestre + 1 };
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="flex items-center rounded-lg border border-borde bg-superficie">
        <Link aria-label="Período anterior" className="grid size-10 place-items-center" href={prev ? url(prev) : url(tPrev)}><ChevronLeft className="size-4" /></Link>
        <span className="min-w-32 text-center text-sm font-medium">{etiquetaPeriodo(p)}</span>
        <Link aria-label="Período siguiente" className="grid size-10 place-items-center" href={next ? url(next) : url(tNext)}><ChevronRight className="size-4" /></Link>
      </div>
      {trimestral && (
        <div className="flex rounded-lg border border-borde bg-superficie p-0.5 text-sm">
          <Link href={url({ periodo: "MENSUAL" })} className={`rounded-md px-3 py-1.5 ${p.periodo === "MENSUAL" ? "bg-marca-50 font-medium text-marca-700" : "text-texto-suave"}`}>Mensual</Link>
          <Link href={url({ periodo: "TRIMESTRAL" })} className={`rounded-md px-3 py-1.5 ${p.periodo === "TRIMESTRAL" ? "bg-marca-50 font-medium text-marca-700" : "text-texto-suave"}`}>Trimestral</Link>
        </div>
      )}
    </div>
  );
}
