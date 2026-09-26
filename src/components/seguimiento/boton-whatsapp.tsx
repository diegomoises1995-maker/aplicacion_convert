"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { IconoWhatsApp } from "@/components/whatsapp";
import { aplicarPlantilla, enlaceWhatsApp } from "@/lib/whatsapp";
import { registrarWhatsApp } from "@/server/acciones/actividades";
import { cn } from "@/lib/utils";

export type Plantilla = { id: string; nombre: string; mensaje: string };

/** Abre WhatsApp con un mensaje plantilla y registra el contacto como actividad. */
export function BotonWhatsApp({
  clienteId, numero, plantillas, variables, className,
}: {
  clienteId: string; numero: string; plantillas: Plantilla[];
  variables: Record<string, string | null | undefined>; className?: string;
}) {
  const [abierto, setAbierto] = useState(false);

  function abrir(p: Plantilla | null) {
    // Abrir primero (dentro del clic) para que el navegador no bloquee la ventana.
    window.open(enlaceWhatsApp(numero, p ? aplicarPlantilla(p.mensaje, variables) : undefined), "_blank", "noopener");
    setAbierto(false);
    void registrarWhatsApp(clienteId, p?.nombre ?? null);
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-500"
      >
        <IconoWhatsApp className="size-5" /> WhatsApp <ChevronDown className="size-4" aria-hidden />
      </button>
      {abierto && (
        <ul className="absolute left-0 right-0 z-20 mt-1 min-w-64 overflow-hidden rounded-lg border border-borde bg-superficie shadow-lg">
          {plantillas.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => abrir(p)} className="block w-full px-3 py-2 text-left text-sm hover:bg-fondo">
                <span className="font-medium">{p.nombre}</span>
                <span className="line-clamp-2 block text-xs text-texto-suave">{aplicarPlantilla(p.mensaje, variables)}</span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => abrir(null)} className="block w-full border-t border-borde px-3 py-2 text-left text-sm hover:bg-fondo">
              Mensaje en blanco
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
