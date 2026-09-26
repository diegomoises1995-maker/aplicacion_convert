"use client";

import { useActionState } from "react";
import { guardarCurva } from "@/server/acciones/catalogo";
import { NOMBRE_GENERO } from "@/lib/catalogo";
import { Campo, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/campos";
import { BotonEnviar, Formulario, MensajeForm } from "@/components/ui/formulario";

export function FormularioCurva() {
  const [estado, accion, pendiente] = useActionState(guardarCurva, undefined);
  const e = estado?.errores ?? {};
  return (
    <Formulario accion={accion} pendiente={pendiente} estado={estado} resetAlExito className="space-y-3">
      <Campo label="Nombre" htmlFor="nombre" error={e.nombre}>
        <Input id="nombre" name="nombre" placeholder="Caballero 38-43 (12 pares)" required />
      </Campo>
      <Campo label="Género" htmlFor="genero" error={e.genero}>
        <Select id="genero" name="genero" defaultValue="CABALLERO">
          {Object.entries(NOMBRE_GENERO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Campo>
      <Campo label="Distribución (talla:pares)" htmlFor="distribucion" error={e.distribucion}>
        <Input id="distribucion" name="distribucion" placeholder="38:1, 39:2, 40:3, 41:3, 42:2, 43:1" required />
      </Campo>
      <MensajeForm estado={estado} />
      <BotonEnviar tamano="sm">Crear curva</BotonEnviar>
    </Formulario>
  );
}
