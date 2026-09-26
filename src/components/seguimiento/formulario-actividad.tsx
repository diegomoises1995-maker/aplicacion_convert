"use client";

import { useActionState, useState } from "react";
import { crearActividad } from "@/server/acciones/actividades";
import { NOMBRE_RESULTADO, NOMBRE_TIPO_ACTIVIDAD } from "@/lib/actividades";
import { Campo, Input } from "@/components/ui/input";
import { Checkbox, Select, Textarea } from "@/components/ui/campos";
import { BotonEnviar, Formulario, MensajeForm } from "@/components/ui/formulario";

type Opcion = { id: string; nombre: string };

export function FormularioActividad({
  clienteId, oportunidadId, clientes, vendedores, ahora, clienteInicial,
}: {
  clienteId?: string; oportunidadId?: string; clientes?: Opcion[]; vendedores?: Opcion[]; ahora: string; clienteInicial?: string;
}) {
  const [estado, accion, pendiente] = useActionState(crearActividad, undefined);
  const [realizada, setRealizada] = useState(true);
  const e = estado?.errores ?? {};

  return (
    <Formulario accion={accion} pendiente={pendiente} estado={estado} resetAlExito className="grid gap-3 md:grid-cols-2">
      {clienteId ? <input type="hidden" name="clienteId" value={clienteId} /> : clientes && (
        <Campo label="Cliente" htmlFor="clienteId" error={e.clienteId}>
          <Select id="clienteId" name="clienteId" defaultValue={clienteInicial ?? ""}>
            <option value="">Sin cliente (tarea interna)</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </Select>
        </Campo>
      )}
      {oportunidadId && <input type="hidden" name="oportunidadId" value={oportunidadId} />}
      <Campo label="Tipo" htmlFor="tipo" error={e.tipo}>
        <Select id="tipo" name="tipo" defaultValue="LLAMADA">
          {Object.entries(NOMBRE_TIPO_ACTIVIDAD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Campo>
      <Campo label="Asunto" htmlFor="asunto" error={e.asunto}>
        <Input id="asunto" name="asunto" placeholder="Ej. Presentar nuevos modelos" required />
      </Campo>
      {vendedores && vendedores.length > 0 && (
        <Campo label="Responsable" htmlFor="vendedorId" error={e.vendedorId}>
          <Select id="vendedorId" name="vendedorId" defaultValue="">
            <option value="">Yo</option>
            {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
          </Select>
        </Campo>
      )}
      <div className="flex items-end pb-2 md:col-span-2">
        <Checkbox name="realizada" checked={realizada} onChange={(ev) => setRealizada(ev.target.checked)} label="Ya la realicé (si no, queda programada)" />
      </div>
      <Campo label={realizada ? "Fecha y hora" : "Programar para"} htmlFor="fecha" error={e.fecha}>
        <Input id="fecha" name="fecha" type="datetime-local" defaultValue={ahora} required />
      </Campo>
      {realizada && (
        <Campo label="Resultado" htmlFor="resultado" error={e.resultado}>
          <Select id="resultado" name="resultado" defaultValue="EXITOSA">
            {Object.entries(NOMBRE_RESULTADO).filter(([k]) => k !== "PENDIENTE").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Campo>
      )}
      <div className="md:col-span-2">
        <Campo label="Notas" htmlFor="descripcion" error={e.descripcion}>
          <Textarea id="descripcion" name="descripcion" placeholder="¿Qué se conversó?" />
        </Campo>
      </div>
      {realizada && (
        <>
          <Campo label="Próxima acción" htmlFor="proximaAccion" error={e.proximaAccion}>
            <Input id="proximaAccion" name="proximaAccion" placeholder="Ej. Enviar cotización" />
          </Campo>
          <Campo label="¿Cuándo?" htmlFor="proximaAccionFecha" error={e.proximaAccionFecha}>
            <Input id="proximaAccionFecha" name="proximaAccionFecha" type="datetime-local" />
          </Campo>
        </>
      )}
      <div className="space-y-3 md:col-span-2">
        <MensajeForm estado={estado} />
        <BotonEnviar className="w-full md:w-auto">{realizada ? "Registrar actividad" : "Programar"}</BotonEnviar>
      </div>
    </Formulario>
  );
}
