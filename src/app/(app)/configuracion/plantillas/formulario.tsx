"use client";

import { useActionState } from "react";
import { guardarPlantilla } from "@/server/acciones/plantillas";
import { Campo, Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/campos";
import { BotonEnviar, Formulario, MensajeForm } from "@/components/ui/formulario";

export function FormularioPlantilla({ plantilla }: { plantilla?: { id: string; nombre: string; mensaje: string } }) {
  const [estado, accion, pendiente] = useActionState(guardarPlantilla.bind(null, plantilla?.id ?? null), undefined);
  const k = plantilla?.id ?? "nueva";
  return (
    <Formulario accion={accion} pendiente={pendiente} estado={estado} resetAlExito={!plantilla} className="space-y-3">
      <Campo label="Nombre" htmlFor={`n-${k}`} error={estado?.errores?.nombre}>
        <Input id={`n-${k}`} name="nombre" defaultValue={plantilla?.nombre} required />
      </Campo>
      <Campo label="Mensaje" htmlFor={`m-${k}`} error={estado?.errores?.mensaje}>
        <Textarea id={`m-${k}`} name="mensaje" defaultValue={plantilla?.mensaje} required />
      </Campo>
      <MensajeForm estado={estado} />
      <BotonEnviar tamano="sm">{plantilla ? "Guardar" : "Crear"}</BotonEnviar>
    </Formulario>
  );
}
