"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { marcarAlertaAtendida } from "@/server/acciones/alertas";
import { Button } from "@/components/ui/button";

export function BotonAtendida({ id }: { id: string }) {
  const [pendiente, startTransition] = useTransition();
  return (
    <Button variante="secundario" disabled={pendiente} onClick={() => startTransition(async () => void (await marcarAlertaAtendida(id)))} aria-label="Marcar como atendida">
      <Check className="size-4" aria-hidden /> Atendida
    </Button>
  );
}
