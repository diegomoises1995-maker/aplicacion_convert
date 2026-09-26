"use client";

import { useState, useTransition } from "react";
import { GripVertical } from "lucide-react";
import Link from "next/link";
import {
  DndContext, PointerSensor, KeyboardSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors,
  pointerWithin, rectIntersection, type CollisionDetection, type DragEndEvent,
} from "@dnd-kit/core";
import { moverOportunidad } from "@/server/acciones/oportunidades";
import { ETAPAS, MOTIVOS_PERDIDA, NOMBRE_ETAPA, type Etapa } from "@/lib/pipeline";
import { formatFecha, formatSoles } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/campos";
import { cn } from "@/lib/utils";

export type Tarjeta = {
  id: string; titulo: string; etapa: Etapa; valorEstimado: number; fechaCierreProbable: string | null;
  motivoPerdida: string | null; cliente: string; vendedor: string | null;
};

const COLOR: Record<Etapa, string> = {
  PROSPECTO: "border-t-stone-400",
  CONTACTADO: "border-t-sky-500",
  COTIZACION_ENVIADA: "border-t-amber-500",
  NEGOCIACION: "border-t-marca-500",
  GANADO: "border-t-emerald-500",
  PERDIDO: "border-t-red-500",
};

// La columna bajo el puntero manda; con teclado se usa la intersección.
const colision: CollisionDetection = (args) => {
  const bajoPuntero = pointerWithin(args);
  return bajoPuntero.length ? bajoPuntero : rectIntersection(args);
};

export function Kanban({ inicial }: { inicial: Tarjeta[] }) {
  const [tarjetas, setTarjetas] = useState(inicial);
  const [error, setError] = useState<string | null>(null);
  const [perdida, setPerdida] = useState<{ id: string; motivo: string } | null>(null);
  const [, startTransition] = useTransition();
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  function mover(id: string, etapa: Etapa, motivo?: string) {
    const previa = tarjetas;
    const actual = tarjetas.find((t) => t.id === id);
    if (!actual || actual.etapa === etapa) return;
    if (etapa === "PERDIDO" && !motivo) {
      setPerdida({ id, motivo: MOTIVOS_PERDIDA[0]! });
      return;
    }
    setError(null);
    setTarjetas((ts) => ts.map((t) => (t.id === id ? { ...t, etapa, motivoPerdida: motivo ?? null } : t)));
    startTransition(async () => {
      const r = await moverOportunidad(id, etapa, motivo);
      if (r.error) {
        setTarjetas(previa);
        setError(r.error);
      }
    });
  }

  function alSoltar(e: DragEndEvent) {
    if (e.over) mover(String(e.active.id), e.over.id as Etapa);
  }

  return (
    <>
      {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <DndContext
        sensors={sensores}
        collisionDetection={colision}
        onDragEnd={alSoltar}
      >
        <div className="relative -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
          {ETAPAS.map((etapa) => {
            const col = tarjetas.filter((t) => t.etapa === etapa);
            return (
              <Columna key={etapa} etapa={etapa} total={col.reduce((s, t) => s + t.valorEstimado, 0)} cantidad={col.length}>
                {col.map((t) => <TarjetaOp key={t.id} t={t} onMover={mover} />)}
              </Columna>
            );
          })}
        </div>
      </DndContext>

      {perdida && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="titulo-perdida">
          <div className="w-full max-w-sm rounded-xl bg-superficie p-5 shadow-xl">
            <h2 id="titulo-perdida" className="font-semibold">¿Por qué se perdió?</h2>
            <Select className="mt-3" value={perdida.motivo} onChange={(e) => setPerdida({ ...perdida, motivo: e.target.value })}>
              {MOTIVOS_PERDIDA.map((m) => <option key={m}>{m}</option>)}
            </Select>
            <div className="mt-4 flex justify-end gap-2">
              <Button variante="fantasma" onClick={() => setPerdida(null)}>Cancelar</Button>
              <Button variante="peligro" onClick={() => { mover(perdida.id, "PERDIDO", perdida.motivo); setPerdida(null); }}>Marcar perdida</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Columna({ etapa, total, cantidad, children }: { etapa: Etapa; total: number; cantidad: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa });
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex w-[82vw] max-w-72 shrink-0 snap-start flex-col rounded-xl border border-t-4 border-borde bg-stone-100/70 md:w-72",
        COLOR[etapa],
        isOver && "ring-2 ring-marca-500",
      )}
    >
      <header className="px-3 py-2">
        <h2 className="text-sm font-semibold">{NOMBRE_ETAPA[etapa]} <span className="font-normal text-texto-suave">({cantidad})</span></h2>
        <p className="text-xs text-texto-suave">{formatSoles(total)}</p>
      </header>
      <ul className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">{children}</ul>
    </section>
  );
}

function TarjetaOp({ t, onMover }: { t: Tarjeta; onMover: (id: string, etapa: Etapa) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: t.id });
  const vencida = t.fechaCierreProbable && new Date(t.fechaCierreProbable) < new Date() && t.etapa !== "GANADO" && t.etapa !== "PERDIDO";
  return (
    <li
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn("rounded-lg border border-borde bg-superficie p-3 shadow-sm", isDragging && "z-10 opacity-80 shadow-lg")}
    >
      <div className="flex gap-1">
        <div className="min-w-0 flex-1">
          <Link href={`/pipeline/${t.id}`} className="block font-medium leading-tight hover:text-marca-700">{t.titulo}</Link>
          <p className="mt-0.5 truncate text-xs text-texto-suave">{t.cliente}{t.vendedor ? ` · ${t.vendedor}` : ""}</p>
        </div>
        <button
          type="button"
          {...listeners}
          {...attributes}
          aria-label={`Arrastrar ${t.titulo}`}
          className="-mr-1 grid h-8 w-6 shrink-0 cursor-grab touch-none place-items-center rounded text-texto-suave hover:bg-fondo active:cursor-grabbing"
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="font-semibold">{formatSoles(t.valorEstimado)}</span>
        {t.fechaCierreProbable && (
          <span className={cn("text-xs", vencida ? "text-red-600" : "text-texto-suave")}>{formatFecha(t.fechaCierreProbable)}</span>
        )}
      </div>
      {t.motivoPerdida && <p className="mt-1 text-xs text-red-700">Motivo: {t.motivoPerdida}</p>}
      <label className="mt-2 block md:hidden">
        <select
          aria-label="Mover a"
          className="h-9 w-full rounded-md border border-borde bg-fondo px-2 text-sm"
          value=""
          onChange={(e) => e.target.value && onMover(t.id, e.target.value as Etapa)}
        >
          <option value="">Mover a…</option>
          {ETAPAS.filter((e) => e !== t.etapa).map((e) => <option key={e} value={e}>{NOMBRE_ETAPA[e]}</option>)}
        </select>
      </label>
    </li>
  );
}
