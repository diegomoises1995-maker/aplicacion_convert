"use client";

import { useActionState, useState } from "react";
import { crearRegla } from "@/server/acciones/comisiones";
import { NOMBRE_TIPO_REGLA, type TipoRegla } from "@/lib/comisiones";
import { Campo, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/campos";
import { BotonEnviar, Formulario, MensajeForm } from "@/components/ui/formulario";

export function FormularioRegla() {
  const [estado, accion, pendiente] = useActionState(crearRegla, undefined);
  const [tipo, setTipo] = useState<TipoRegla>("PORCENTAJE_VENTA_COBRADA");
  const e = estado?.errores ?? {};
  return (
    <Formulario accion={accion} pendiente={pendiente} estado={estado} resetAlExito className="space-y-3">
      <Campo label="Nombre" htmlFor="nombre" error={e.nombre}>
        <Input id="nombre" name="nombre" placeholder="Ej. Comisión 3 % sobre cobrado" required />
      </Campo>
      <Campo label="Tipo" htmlFor="tipo" error={e.tipo}>
        <Select id="tipo" name="tipo" value={tipo} onChange={(ev) => setTipo(ev.target.value as TipoRegla)}>
          {Object.entries(NOMBRE_TIPO_REGLA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Campo>
      <Campo label={tipo === "PORCENTAJE_VENTA_COBRADA" ? "Porcentaje (%)" : tipo === "BONO_CUMPLIMIENTO_META" ? "Bono (S/)" : "Bono por cliente (S/)"} htmlFor="valor" error={e.valor}>
        <Input id="valor" name="valor" type="number" step="0.01" min="0" required />
      </Campo>
      {tipo === "BONO_CUMPLIMIENTO_META" && (
        <Campo label="Desde % de cumplimiento" htmlFor="umbralCumplimiento" error={e.umbralCumplimiento}>
          <Input id="umbralCumplimiento" name="umbralCumplimiento" type="number" min="1" placeholder="100" required />
        </Campo>
      )}
      <Campo label="Vigente desde" htmlFor="vigenteDesde" error={e.vigenteDesde}>
        <Input id="vigenteDesde" name="vigenteDesde" type="date" />
      </Campo>
      <MensajeForm estado={estado} />
      <BotonEnviar tamano="sm">Crear regla</BotonEnviar>
    </Formulario>
  );
}
