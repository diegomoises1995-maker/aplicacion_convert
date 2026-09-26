"use client";

import { useActionState, useState } from "react";
import { guardarZona } from "@/server/acciones/configuracion";
import { Campo, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BotonEnviar, Formulario, MensajeForm } from "@/components/ui/formulario";

export function FormularioZona({ zona }: { zona?: { id: string; nombre: string; descripcion: string | null } }) {
  const [estado, accion, pendiente] = useActionState(guardarZona.bind(null, zona?.id ?? null), undefined);
  const [abierto, setAbierto] = useState(!zona);

  if (!abierto) {
    return <Button variante="fantasma" tamano="sm" onClick={() => setAbierto(true)}>Editar</Button>;
  }
  return (
    <Formulario accion={accion} pendiente={pendiente} estado={estado} resetAlExito={!zona} className={zona ? "flex w-full flex-wrap items-end gap-2" : "space-y-3"}>
      <Campo label="Nombre" htmlFor={`nombre-${zona?.id ?? "nueva"}`} error={estado?.errores?.nombre}>
        <Input id={`nombre-${zona?.id ?? "nueva"}`} name="nombre" defaultValue={zona?.nombre} required />
      </Campo>
      <Campo label="Descripción" htmlFor={`desc-${zona?.id ?? "nueva"}`}>
        <Input id={`desc-${zona?.id ?? "nueva"}`} name="descripcion" defaultValue={zona?.descripcion ?? ""} />
      </Campo>
      <MensajeForm estado={estado} />
      <BotonEnviar tamano="sm">{zona ? "Guardar" : "Crear zona"}</BotonEnviar>
    </Formulario>
  );
}
