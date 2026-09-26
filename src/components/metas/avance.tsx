import { CircleAlert, CircleCheck, CircleMinus, TriangleAlert } from "lucide-react";
import { ESTILO_SEMAFORO, NOMBRE_TIPO_META, type Semaforo, type TipoMeta } from "@/lib/metas";
import { formatNumero, formatPorcentaje, formatSoles } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICONO = { verde: CircleCheck, amarillo: TriangleAlert, rojo: CircleAlert, sin_meta: CircleMinus };

/** Semáforo con ícono + texto (nunca solo color). */
export function BadgeSemaforo({ s, className }: { s: Semaforo; className?: string }) {
  const Icono = ICONO[s];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", ESTILO_SEMAFORO[s].clase, className)}>
      <Icono className="size-3.5" aria-hidden /> {ESTILO_SEMAFORO[s].texto}
    </span>
  );
}

export function valorMeta(tipo: TipoMeta, v: number | null) {
  if (v === null) return "—";
  return tipo === "SOLES" ? formatSoles(v) : formatNumero(v);
}

/** Barra de avance con marca del avance esperado a la fecha. */
export function BarraAvance({
  tipo, real, meta, cumplimiento, semaforo, fraccion, compacta,
}: {
  tipo: TipoMeta; real: number; meta: number | null; cumplimiento: number | null; semaforo: Semaforo; fraccion: number; compacta?: boolean;
}) {
  const ancho = Math.min(100, (cumplimiento ?? 0) * 100);
  return (
    <div>
      {!compacta && (
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-sm text-texto-suave">{NOMBRE_TIPO_META[tipo]}</span>
          <BadgeSemaforo s={semaforo} />
        </div>
      )}
      <div className="flex items-baseline justify-between gap-2">
        <span className={compacta ? "text-sm font-medium" : "text-xl font-semibold"}>{valorMeta(tipo, real)}</span>
        <span className="text-xs text-texto-suave">
          {meta !== null ? <>de {valorMeta(tipo, meta)} · <strong className="text-texto">{formatPorcentaje(cumplimiento)}</strong></> : "sin meta"}
        </span>
      </div>
      <div
        className="relative mt-1.5 h-2 rounded-full bg-stone-200"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round((cumplimiento ?? 0) * 100)}
        aria-label={`${NOMBRE_TIPO_META[tipo]}: ${formatPorcentaje(cumplimiento)} de la meta`}
      >
        <div className={cn("h-2 rounded-full", ESTILO_SEMAFORO[semaforo].barra)} style={{ width: `${ancho}%` }} />
        {meta !== null && fraccion < 1 && (
          <span className="absolute -top-0.5 h-3 w-0.5 rounded bg-texto/60" style={{ left: `${fraccion * 100}%` }} title="Avance esperado a la fecha" />
        )}
      </div>
    </div>
  );
}

export function Variacion({ v, titulo }: { v: number | null; titulo?: string }) {
  if (v === null) return <span className="text-texto-suave">—</span>;
  const positivo = v >= 0;
  return (
    <span className={positivo ? "text-emerald-700" : "text-red-700"} title={titulo}>
      {positivo ? "▲" : "▼"} {formatPorcentaje(Math.abs(v))}
    </span>
  );
}
