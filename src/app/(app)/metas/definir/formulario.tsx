"use client";

import { useActionState, useState, useTransition } from "react";
import { copiarMetasMesAnterior, guardarMetas } from "@/server/acciones/metas";
import { NOMBRE_TIPO_META, TIPOS_META, type TipoMeta } from "@/lib/metas";
import { formatSoles } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BotonEnviar, Formulario, MensajeForm } from "@/components/ui/formulario";

export type FilaMeta = { clave: string; titulo: string; subtitulo: string; valores: Record<string, number | null>; referencia: number | null };
type Destino = { periodo: "MENSUAL" | "TRIMESTRAL"; anio: number; mes: number | null; trimestre: number | null };

export function FormularioMetas({ destino, filas, etiquetaReferencia }: { destino: Destino; filas: FilaMeta[]; etiquetaReferencia: string }) {
  const [estado, accion, pendiente] = useActionState(guardarMetas.bind(null, destino), undefined);
  const [copiando, startTransition] = useTransition();
  const [msgCopia, setMsgCopia] = useState<string | null>(null);

  return (
    <Formulario accion={accion} pendiente={pendiente} className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-2">
        {filas.map((f) => (
          <Card key={f.clave}>
            <p className="font-medium">{f.titulo}</p>
            <p className="text-xs text-texto-suave">
              {f.subtitulo}{f.referencia !== null && ` · ${formatSoles(f.referencia)} ${etiquetaReferencia}`}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {TIPOS_META.map((t: TipoMeta) => {
                const nombre = `meta__${f.clave}__${t}`;
                return (
                  <label key={t} className="text-sm">
                    <span className="mb-1 block text-xs text-texto-suave">{NOMBRE_TIPO_META[t]}</span>
                    <input
                      name={nombre}
                      type="number"
                      min={0}
                      step={t === "SOLES" ? "100" : "1"}
                      inputMode="decimal"
                      defaultValue={f.valores[t] ?? ""}
                      className={`h-10 w-full rounded-lg border px-3 text-base md:text-sm ${estado?.errores?.[nombre] ? "border-red-400" : "border-borde"}`}
                    />
                  </label>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
      <div className="sticky bottom-20 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-borde bg-superficie p-3 shadow-sm md:bottom-4">
        <BotonEnviar>Guardar metas</BotonEnviar>
        {destino.periodo === "MENSUAL" && (
          <Button
            type="button"
            variante="secundario"
            disabled={copiando}
            onClick={() =>
              startTransition(async () => {
                const r = await copiarMetasMesAnterior(destino.anio, destino.mes!);
                setMsgCopia(r.error ?? `${r.copiadas} meta(s) copiadas. Recarga para verlas.`);
                if (!r.error) window.location.reload();
              })
            }
          >
            Copiar del mes anterior
          </Button>
        )}
        <div className="w-full sm:w-auto"><MensajeForm estado={estado} /></div>
        {msgCopia && <p className="text-sm text-texto-suave">{msgCopia}</p>}
      </div>
    </Formulario>
  );
}
