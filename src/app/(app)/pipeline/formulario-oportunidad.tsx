"use client";

import { useActionState, useState } from "react";
import { guardarOportunidad } from "@/server/acciones/oportunidades";
import { ETAPAS, MOTIVOS_PERDIDA, NOMBRE_ETAPA, type Etapa } from "@/lib/pipeline";
import { Campo, Input } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/campos";
import { BotonEnviar, Formulario, MensajeForm } from "@/components/ui/formulario";

export type OportunidadForm = {
  id: string; titulo: string; clienteId: string; etapa: Etapa; valorEstimado: number; paresEstimados: number | null;
  fechaCierreProbable: string; motivoPerdida: string | null; notas: string | null;
};

export function FormularioOportunidad({
  op, clientes, clienteInicial,
}: { op?: OportunidadForm; clientes: { id: string; nombre: string }[]; clienteInicial?: string }) {
  const [estado, accion, pendiente] = useActionState(guardarOportunidad.bind(null, op?.id ?? null), undefined);
  const [etapa, setEtapa] = useState<Etapa>(op?.etapa ?? "PROSPECTO");
  const e = estado?.errores ?? {};
  return (
    <Formulario accion={accion} pendiente={pendiente} className="grid gap-4 md:grid-cols-2">
      <Campo label="Título" htmlFor="titulo" error={e.titulo}>
        <Input id="titulo" name="titulo" defaultValue={op?.titulo} placeholder="Ej. Pedido campaña escolar" required />
      </Campo>
      <Campo label="Cliente" htmlFor="clienteId" error={e.clienteId}>
        <Select id="clienteId" name="clienteId" defaultValue={op?.clienteId ?? clienteInicial ?? ""} required>
          <option value="" disabled>Elige un cliente</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </Select>
      </Campo>
      <Campo label="Etapa" htmlFor="etapa" error={e.etapa}>
        <Select id="etapa" name="etapa" value={etapa} onChange={(ev) => setEtapa(ev.target.value as Etapa)}>
          {ETAPAS.map((x) => <option key={x} value={x}>{NOMBRE_ETAPA[x]}</option>)}
        </Select>
      </Campo>
      {etapa === "PERDIDO" && (
        <Campo label="Motivo de pérdida" htmlFor="motivoPerdida" error={e.motivoPerdida}>
          <Select id="motivoPerdida" name="motivoPerdida" defaultValue={op?.motivoPerdida ?? ""} required>
            <option value="" disabled>Elige un motivo</option>
            {MOTIVOS_PERDIDA.map((m) => <option key={m}>{m}</option>)}
          </Select>
        </Campo>
      )}
      <Campo label="Valor estimado (S/ sin IGV)" htmlFor="valorEstimado" error={e.valorEstimado}>
        <Input id="valorEstimado" name="valorEstimado" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={op?.valorEstimado ?? ""} required />
      </Campo>
      <Campo label="Pares estimados" htmlFor="paresEstimados" error={e.paresEstimados}>
        <Input id="paresEstimados" name="paresEstimados" type="number" min="0" inputMode="numeric" defaultValue={op?.paresEstimados ?? ""} />
      </Campo>
      <Campo label="Fecha probable de cierre" htmlFor="fechaCierreProbable" error={e.fechaCierreProbable}>
        <Input id="fechaCierreProbable" name="fechaCierreProbable" type="date" defaultValue={op?.fechaCierreProbable} />
      </Campo>
      <div className="md:col-span-2">
        <Campo label="Notas" htmlFor="notas" error={e.notas}>
          <Textarea id="notas" name="notas" defaultValue={op?.notas ?? ""} />
        </Campo>
      </div>
      <div className="space-y-3 md:col-span-2">
        <MensajeForm estado={estado} />
        <BotonEnviar>{op ? "Guardar cambios" : "Crear oportunidad"}</BotonEnviar>
      </div>
    </Formulario>
  );
}
