"use client";

import { useState, useTransition } from "react";
import { ejecutarTareasAhora } from "@/server/acciones/alertas";
import { Button } from "@/components/ui/button";

export function BotonTareas() {
  const [pendiente, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variante="secundario"
        disabled={pendiente}
        onClick={() =>
          startTransition(async () => {
            const r = await ejecutarTareasAhora();
            const x = r.resultado;
            setMsg(r.error ?? (x ? `${x.clientes} clientes revisados · ${x.cambiosEstado} cambios de estado · ${x.alertasNuevas} alertas nuevas · ${x.alertasCerradas} cerradas · ${x.cotizacionesVencidas} cotizaciones vencidas` : null));
          })
        }
      >
        {pendiente ? "Ejecutando…" : "Ejecutar ahora"}
      </Button>
      {msg && <p className="text-sm text-texto-suave">{msg}</p>}
    </div>
  );
}
