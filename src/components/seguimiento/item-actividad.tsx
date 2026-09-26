"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CalendarClock, CheckCircle2, Mail, MapPin, MessageCircle, Phone, Users, ClipboardList } from "lucide-react";
import { completarActividad } from "@/server/acciones/actividades";
import { NOMBRE_RESULTADO, NOMBRE_TIPO_ACTIVIDAD, type ResultadoActividad, type TipoActividad } from "@/lib/actividades";
import { formatFecha } from "@/lib/format";
import { Campo, Input } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/campos";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { BotonEnviar, Formulario, MensajeForm } from "@/components/ui/formulario";
import { cn } from "@/lib/utils";

const ICONO = { LLAMADA: Phone, WHATSAPP: MessageCircle, VISITA: MapPin, REUNION: Users, EMAIL: Mail, TAREA: ClipboardList };

export type ActividadVista = {
  id: string; tipo: TipoActividad; asunto: string; descripcion: string | null; resultado: ResultadoActividad;
  fechaProgramada: Date; fechaRealizada: Date | null; completada: boolean; proximaAccion: string | null;
  cliente: { id: string; nombre: string; telefono: string | null } | null;
  vendedor?: string | null;
};

export function ItemActividad({ a, vencida, mostrarCliente = true }: { a: ActividadVista; vencida?: boolean; mostrarCliente?: boolean }) {
  const [completando, setCompletando] = useState(false);
  const Icono = ICONO[a.tipo];
  return (
    <li className="p-3 md:px-4">
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-full", a.completada ? "bg-emerald-50 text-emerald-700" : vencida ? "bg-red-50 text-red-700" : "bg-marca-50 text-marca-700")}>
          {a.completada ? <CheckCircle2 className="size-5" /> : <Icono className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{a.asunto}</p>
          <p className="text-sm text-texto-suave">
            {NOMBRE_TIPO_ACTIVIDAD[a.tipo]} · {formatFecha(a.completada ? (a.fechaRealizada ?? a.fechaProgramada) : a.fechaProgramada, true)}
            {mostrarCliente && a.cliente && (
              <> · <Link className="text-marca-700" href={`/clientes/${a.cliente.id}`}>{a.cliente.nombre}</Link></>
            )}
            {a.vendedor && ` · ${a.vendedor}`}
          </p>
          {a.descripcion && <p className="mt-1 whitespace-pre-line text-sm">{a.descripcion}</p>}
          <div className="mt-1 flex flex-wrap gap-1">
            {a.completada && <Badge tono={a.resultado === "EXITOSA" ? "verde" : "neutro"}>{NOMBRE_RESULTADO[a.resultado]}</Badge>}
            {vencida && <Badge tono="rojo">Vencida</Badge>}
            {a.proximaAccion && <Badge tono="marca"><CalendarClock className="mr-1 size-3" />{a.proximaAccion}</Badge>}
          </div>
        </div>
        {!a.completada && !completando && (
          <div className="flex shrink-0 gap-1">
            {a.cliente?.telefono && (a.tipo === "LLAMADA" || a.tipo === "TAREA") && (
              <a href={`tel:${a.cliente.telefono}`} aria-label="Llamar" className="grid size-9 place-items-center rounded-full text-texto-suave hover:bg-fondo">
                <Phone className="size-4" />
              </a>
            )}
            <Button tamano="sm" variante="secundario" onClick={() => setCompletando(true)}>Completar</Button>
          </div>
        )}
      </div>
      {completando && <FormularioCompletar id={a.id} onCancelar={() => setCompletando(false)} />}
    </li>
  );
}

function FormularioCompletar({ id, onCancelar }: { id: string; onCancelar: () => void }) {
  const [estado, accion, pendiente] = useActionState(completarActividad.bind(null, id), undefined);
  const e = estado?.errores ?? {};
  if (estado?.ok) return <p className="mt-2 text-sm text-emerald-700">{estado.mensaje}</p>;
  return (
    <Formulario accion={accion} pendiente={pendiente} className="mt-3 grid gap-3 rounded-lg bg-fondo p-3 md:grid-cols-2">
      <Campo label="Resultado" htmlFor={`res-${id}`} error={e.resultado}>
        <Select id={`res-${id}`} name="resultado" defaultValue="EXITOSA">
          {Object.entries(NOMBRE_RESULTADO).filter(([k]) => k !== "PENDIENTE").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Campo>
      <Campo label="Notas" htmlFor={`notas-${id}`}>
        <Textarea id={`notas-${id}`} name="notas" className="min-h-11" />
      </Campo>
      <Campo label="Próxima acción" htmlFor={`prox-${id}`}>
        <Input id={`prox-${id}`} name="proximaAccion" placeholder="Opcional" />
      </Campo>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Tipo" htmlFor={`ptipo-${id}`}>
          <Select id={`ptipo-${id}`} name="proximaTipo" defaultValue="LLAMADA">
            {Object.entries(NOMBRE_TIPO_ACTIVIDAD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Campo>
        <Campo label="¿Cuándo?" htmlFor={`pfecha-${id}`} error={e.proximaAccionFecha}>
          <Input id={`pfecha-${id}`} name="proximaAccionFecha" type="datetime-local" />
        </Campo>
      </div>
      <div className="flex flex-wrap gap-2 md:col-span-2">
        <MensajeForm estado={estado} />
        <BotonEnviar tamano="sm">Guardar</BotonEnviar>
        <Button type="button" variante="fantasma" tamano="sm" onClick={onCancelar}>Cancelar</Button>
      </div>
    </Formulario>
  );
}
