"use client";

import { useActionState } from "react";
import { actualizarStock, agregarColor } from "@/server/acciones/catalogo";
import { Campo, Input } from "@/components/ui/input";
import { BotonEnviar, Formulario, MensajeForm } from "@/components/ui/formulario";

type Fila = { id: string; nombre: string; hex: string | null; series: number; variantes: { id: string; talla: number; stock: number }[] };

export function FormularioStock({ modeloId, tallas, filas }: { modeloId: string; tallas: number[]; filas: Fila[] }) {
  const [estado, accion, pendiente] = useActionState(actualizarStock.bind(null, modeloId), undefined);
  return (
    <Formulario accion={accion} pendiente={pendiente} className="mt-3 space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-center text-sm">
          <thead className="text-xs text-texto-suave">
            <tr>
              <th className="p-1 text-left">Color</th>
              {tallas.map((t) => <th key={t} className="p-1">{t}</th>)}
              <th className="p-1">Series</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id}>
                <td className="whitespace-nowrap p-1 text-left">
                  <span className="mr-2 inline-block size-3 rounded-full border border-borde align-middle" style={{ background: f.hex ?? "#ccc" }} />
                  {f.nombre}
                </td>
                {tallas.map((t) => {
                  const v = f.variantes.find((x) => x.talla === t);
                  return (
                    <td key={t} className="p-1">
                      {v ? (
                        <input
                          name={`stock_${v.id}`}
                          type="number"
                          min={0}
                          inputMode="numeric"
                          defaultValue={v.stock}
                          aria-label={`${f.nombre} talla ${t}`}
                          className="h-9 w-14 rounded-md border border-borde text-center text-base md:text-sm"
                        />
                      ) : "—"}
                    </td>
                  );
                })}
                <td className="p-1 font-semibold">{f.series}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <MensajeForm estado={estado} />
      <BotonEnviar tamano="sm">Guardar stock</BotonEnviar>
    </Formulario>
  );
}

export function FormularioColor({ modeloId }: { modeloId: string }) {
  const [estado, accion, pendiente] = useActionState(agregarColor.bind(null, modeloId), undefined);
  return (
    <Formulario accion={accion} pendiente={pendiente} estado={estado} resetAlExito className="flex flex-wrap items-end gap-2">
      <Campo label="Agregar color" htmlFor="color" error={estado?.errores?.color}>
        <Input id="color" name="color" placeholder="Ej. Marrón" className="w-40" required />
      </Campo>
      <Campo label="Color (hex)" htmlFor="hex" error={estado?.errores?.hex}>
        <Input id="hex" name="hex" type="color" defaultValue="#8a5a2b" className="w-16 p-1" />
      </Campo>
      <BotonEnviar tamano="sm" variante="secundario">Agregar</BotonEnviar>
      <div className="w-full"><MensajeForm estado={estado} /></div>
    </Formulario>
  );
}
