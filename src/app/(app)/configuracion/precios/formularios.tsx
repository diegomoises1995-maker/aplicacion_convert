"use client";

import { useActionState } from "react";
import { guardarEscala, guardarLista, guardarPrecioModelo } from "@/server/acciones/precios";
import { NOMBRE_TIPO_CLIENTE } from "@/lib/clientes";
import { Campo, Input } from "@/components/ui/input";
import { Checkbox, Select } from "@/components/ui/campos";
import { BotonEnviar, Formulario, MensajeForm } from "@/components/ui/formulario";

type Lista = { id: string; nombre: string; tipoCliente: string | null; ajustePorcentaje: number; activa: boolean };

export function FormularioLista({ lista }: { lista?: Lista }) {
  const [estado, accion, pendiente] = useActionState(guardarLista.bind(null, lista?.id ?? null), undefined);
  const e = estado?.errores ?? {};
  const k = lista?.id ?? "nueva";
  return (
    <Formulario accion={accion} pendiente={pendiente} estado={estado} resetAlExito={!lista} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
      <Campo label="Nombre" htmlFor={`ln-${k}`} error={e.nombre}>
        <Input id={`ln-${k}`} name="nombre" defaultValue={lista?.nombre} placeholder="Ej. Distribuidores" required />
      </Campo>
      <Campo label="Tipo de cliente (automático)" htmlFor={`lt-${k}`} error={e.tipoCliente}>
        <Select id={`lt-${k}`} name="tipoCliente" defaultValue={lista?.tipoCliente ?? ""}>
          <option value="">Ninguno (solo asignación manual)</option>
          {Object.entries(NOMBRE_TIPO_CLIENTE).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
        </Select>
      </Campo>
      <Campo label="Ajuste sobre precio base (%)" htmlFor={`la-${k}`} error={e.ajustePorcentaje}>
        <Input id={`la-${k}`} name="ajustePorcentaje" type="number" step="0.01" defaultValue={lista?.ajustePorcentaje ?? 0} required />
        <p className="mt-1 text-xs text-texto-suave">Negativo = descuento. Ej. −8 para distribuidores.</p>
      </Campo>
      {lista && <Checkbox name="activa" defaultChecked={lista.activa} label="Lista activa" />}
      <MensajeForm estado={estado} />
      <div><BotonEnviar tamano="sm">{lista ? "Guardar lista" : "Crear lista"}</BotonEnviar></div>
    </Formulario>
  );
}

export function FormularioEscala({ listaId }: { listaId: string | null }) {
  const [estado, accion, pendiente] = useActionState(guardarEscala.bind(null, listaId), undefined);
  const e = estado?.errores ?? {};
  const k = listaId ?? "general";
  return (
    <Formulario accion={accion} pendiente={pendiente} estado={estado} resetAlExito className="flex flex-wrap items-end gap-2">
      <Campo label="Desde (series)" htmlFor={`ed-${k}`} error={e.desdeSeries}>
        <Input id={`ed-${k}`} name="desdeSeries" type="number" min="1" className="w-28" required />
      </Campo>
      <Campo label="Descuento %" htmlFor={`ep-${k}`} error={e.descuentoPorcentaje}>
        <Input id={`ep-${k}`} name="descuentoPorcentaje" type="number" step="0.01" min="0" className="w-28" required />
      </Campo>
      <BotonEnviar tamano="sm" variante="secundario">Agregar escala</BotonEnviar>
      <div className="w-full"><MensajeForm estado={estado} /></div>
    </Formulario>
  );
}

export function FormularioPrecioModelo({ listaId, modelos }: { listaId: string; modelos: { id: string; sku: string; nombre: string }[] }) {
  const [estado, accion, pendiente] = useActionState(guardarPrecioModelo.bind(null, listaId), undefined);
  const e = estado?.errores ?? {};
  return (
    <Formulario accion={accion} pendiente={pendiente} estado={estado} resetAlExito className="flex flex-wrap items-end gap-2">
      <Campo label="Modelo" htmlFor={`pm-${listaId}`} error={e.modeloId}>
        <Select id={`pm-${listaId}`} name="modeloId" defaultValue="" className="w-56">
          <option value="" disabled>Elige</option>
          {modelos.map((m) => <option key={m.id} value={m.id}>{m.sku} · {m.nombre}</option>)}
        </Select>
      </Campo>
      <Campo label="Precio por par (vacío = quitar)" htmlFor={`pp-${listaId}`} error={e.precio}>
        <Input id={`pp-${listaId}`} name="precio" type="number" step="0.01" min="0" className="w-40" />
      </Campo>
      <BotonEnviar tamano="sm" variante="secundario">Guardar precio</BotonEnviar>
      <div className="w-full"><MensajeForm estado={estado} /></div>
    </Formulario>
  );
}
