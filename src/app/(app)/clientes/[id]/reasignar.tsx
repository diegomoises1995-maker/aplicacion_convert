"use client";

import { useActionState } from "react";
import { reasignarCliente } from "@/server/acciones/clientes";
import { Campo, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/campos";
import { BotonEnviar, Formulario, MensajeForm } from "@/components/ui/formulario";

export function FormularioReasignarCliente({
  clienteId, vendedores, actual,
}: { clienteId: string; vendedores: { id: string; nombre: string }[]; actual: string | null }) {
  const [estado, accion, pendiente] = useActionState(reasignarCliente.bind(null, clienteId), undefined);
  return (
    <Formulario accion={accion} pendiente={pendiente} estado={estado} className="space-y-3">
      <Campo label="Reasignar a" htmlFor="haciaId" error={estado?.errores?.haciaId}>
        <Select id="haciaId" name="haciaId" defaultValue={actual ?? ""}>
          <option value="">Sin asignar</option>
          {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
        </Select>
      </Campo>
      <Campo label="Motivo" htmlFor="motivo-reasignar">
        <Input id="motivo-reasignar" name="motivo" placeholder="Opcional" />
      </Campo>
      <MensajeForm estado={estado} />
      <BotonEnviar variante="secundario" tamano="sm">Reasignar</BotonEnviar>
    </Formulario>
  );
}
