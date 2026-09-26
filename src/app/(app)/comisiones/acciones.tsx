"use client";

import { useState, useTransition } from "react";
import { cambiarEstadoLiquidacion, generarLiquidaciones } from "@/server/acciones/comisiones";
import { Button } from "@/components/ui/button";

export function BotonGenerar({ anio, mes }: { anio: number; mes: number }) {
  const [pendiente, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="flex items-center gap-2">
      <Button
        disabled={pendiente}
        onClick={() =>
          startTransition(async () => {
            const r = await generarLiquidaciones(anio, mes);
            setMsg(r.error ?? `${r.generadas} liquidación(es) calculadas`);
          })
        }
      >
        {pendiente ? "Calculando…" : "Calcular liquidación"}
      </Button>
      {msg && <span className="text-sm text-texto-suave">{msg}</span>}
    </span>
  );
}

export function AccionesLiquidacion({ id, estado }: { id: string; estado: "BORRADOR" | "APROBADA" | "PAGADA" }) {
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const accion = (e: "APROBADA" | "PAGADA" | "BORRADOR") =>
    startTransition(async () => setError((await cambiarEstadoLiquidacion(id, e)).error ?? null));
  if (estado === "PAGADA") return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2 border-t border-borde pt-3">
      {estado === "BORRADOR" && <Button tamano="sm" disabled={pendiente} onClick={() => accion("APROBADA")}>Aprobar</Button>}
      {estado === "APROBADA" && (
        <>
          <Button tamano="sm" disabled={pendiente} onClick={() => accion("PAGADA")}>Marcar pagada</Button>
          <Button tamano="sm" variante="fantasma" disabled={pendiente} onClick={() => accion("BORRADOR")}>Reabrir</Button>
        </>
      )}
      {error && <p className="w-full text-sm text-red-700">{error}</p>}
    </div>
  );
}
