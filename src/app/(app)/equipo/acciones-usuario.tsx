"use client";

import { useActionState } from "react";
import { reasignarCartera, restablecerPassword } from "@/server/acciones/usuarios";
import { Campo, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/campos";
import { BotonEnviar, Formulario, MensajeForm } from "@/components/ui/formulario";

export function FormularioRestablecer({ id }: { id: string }) {
  const [estado, accion, pendiente] = useActionState(restablecerPassword.bind(null, id), undefined);
  return (
    <Formulario accion={accion} pendiente={pendiente} estado={estado} resetAlExito className="space-y-3">
      <Campo label="Nueva contraseña" htmlFor="password-reset" error={estado?.errores?.password}>
        <Input id="password-reset" name="password" type="text" autoComplete="off" required />
      </Campo>
      <MensajeForm estado={estado} />
      <BotonEnviar variante="secundario">Restablecer contraseña</BotonEnviar>
    </Formulario>
  );
}

export function FormularioReasignarCartera({ desdeId, vendedores }: { desdeId: string; vendedores: { id: string; nombre: string }[] }) {
  const [estado, accion, pendiente] = useActionState(reasignarCartera.bind(null, desdeId), undefined);
  return (
    <Formulario accion={accion} pendiente={pendiente} estado={estado} resetAlExito className="space-y-3">
      <Campo label="Pasar todos sus clientes a" htmlFor="haciaId" error={estado?.errores?.haciaId}>
        <Select id="haciaId" name="haciaId" required defaultValue="">
          <option value="" disabled>Elige un vendedor</option>
          {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
        </Select>
      </Campo>
      <Campo label="Motivo" htmlFor="motivo">
        <Input id="motivo" name="motivo" placeholder="Ej. cambio de zona, renuncia…" />
      </Campo>
      <MensajeForm estado={estado} />
      <BotonEnviar variante="secundario" pendiente="Reasignando…">Reasignar cartera</BotonEnviar>
    </Formulario>
  );
}
