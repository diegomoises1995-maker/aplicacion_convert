"use client";

import { Button } from "@/components/ui/button";

export default function ErrorApp({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-semibold">Algo salió mal</h1>
      <p className="mt-2 text-sm text-texto-suave">
        No pudimos completar la operación. Intenta de nuevo; si el problema continúa, avisa al administrador
        {error.digest ? ` (código ${error.digest})` : ""}.
      </p>
      <Button className="mt-6" onClick={reset}>Reintentar</Button>
    </div>
  );
}
