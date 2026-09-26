"use client";

import { useActionState } from "react";
import { iniciarSesion } from "@/server/acciones/auth";
import { Button } from "@/components/ui/button";
import { Campo, Input } from "@/components/ui/input";

export function FormularioLogin({ callbackUrl }: { callbackUrl?: string }) {
  const [estado, accion, pendiente] = useActionState(iniciarSesion, undefined);

  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />
      <Campo label="Correo" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
      </Campo>
      <Campo label="Contraseña" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Campo>
      {estado?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {estado.error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pendiente}>
        {pendiente ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  );
}
