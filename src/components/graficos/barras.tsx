import { cn } from "@/lib/utils";

/** Barras horizontales en HTML: una sola serie, un solo color, etiquetas directas. */
export function BarrasHorizontales({
  filas, formato, color = "bg-marca-600", colores,
}: {
  filas: { etiqueta: React.ReactNode; valor: number; detalle?: string }[];
  formato: (v: number) => string;
  color?: string;
  colores?: string[]; // por fila (rampa ordinal del embudo)
}) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <ul className="space-y-2.5">
      {filas.map((f, i) => (
        <li key={i} title={f.detalle ? `${formato(f.valor)} · ${f.detalle}` : formato(f.valor)}>
          <div className="mb-1 flex justify-between gap-2 text-sm">
            <span className="min-w-0 truncate">{f.etiqueta}</span>
            <span className="shrink-0 font-medium">{formato(f.valor)}</span>
          </div>
          <div className="h-2 rounded-full bg-stone-100">
            <div
              className={cn("h-2 rounded-r-full rounded-l-sm", colores ? undefined : color)}
              style={{ width: `${Math.max(1, (f.valor / max) * 100)}%`, ...(colores ? { background: colores[i] } : {}) }}
            />
          </div>
          {f.detalle && <p className="mt-0.5 text-xs text-texto-suave">{f.detalle}</p>}
        </li>
      ))}
    </ul>
  );
}

// Rampa ordinal azul (250, 350, 500, 650) para las 4 etapas abiertas del embudo: validada con --ordinal.
export const RAMPA_EMBUDO = ["#86b6ef", "#5598e7", "#256abf", "#104281"];
