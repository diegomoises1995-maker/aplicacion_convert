"use client";

import { useActionState, useEffect, useRef } from "react";
import { cambiarPassword } from "@/server/acciones/perfil";
import { Button } from "@/components/ui/button";
import { Campo, Input } from "@/components/ui/input";

export function FormularioPassword() {
  const [estado, accion, pendiente] = useActionState(cambiarPassword, undefined);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado?.ok) form.current?.reset();
  }, [estado]);

  return (
    <form ref={form} action={accion} className="mt-3 space-y-3">
      <Campo label="Contraseña actual" htmlFor="actual" error={estado?.errores?.actual}>
        <Input id="actual" name="actual" type="password" autoComplete="current-password" required />
      </Campo>
      <Campo label="Nueva contraseña" htmlFor="nueva" error={estado?.errores?.nueva}>
        <Input id="nueva" name="nueva" type="password" autoComplete="new-password" required />
      </Campo>
      <Campo label="Repite la nueva contraseña" htmlFor="confirmacion" error={estado?.errores?.confirmacion}>
        <Input id="confirmacion" name="confirmacion" type="password" autoComplete="new-password" required />
      </Campo>
      {estado?.ok && <p className="text-sm text-emerald-700">Contraseña actualizada.</p>}
      <Button type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Actualizar contraseña"}
      </Button>
    </form>
  );
}
