"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { importarClientes } from "@/server/acciones/clientes";
import { Campo, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/campos";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { Aviso } from "@/components/ui/varios";
import { Formulario } from "@/components/ui/formulario";

export function Importador() {
  const [estado, accion, pendiente] = useActionState(importarClientes, undefined);
  const modo = useRef<HTMLInputElement>(null);
  const r = estado?.resumen;
  const listoParaConfirmar = estado?.modo === "previsualizar" && r && r.crear + r.actualizar > 0;

  return (
    <Formulario accion={accion} pendiente={pendiente} className="space-y-4">
      <input type="hidden" name="modo" ref={modo} defaultValue="previsualizar" />
      <div className="grid gap-4 md:grid-cols-2">
        <Campo label="Archivo (.csv o .xlsx, máx. 5 MB)" htmlFor="archivo">
          <Input id="archivo" name="archivo" type="file" accept=".csv,.xlsx,.txt" required className="py-2" />
        </Campo>
        <Campo label="Si el RUC ya existe" htmlFor="duplicados">
          <Select id="duplicados" name="duplicados" defaultValue="omitir">
            <option value="omitir">Omitir la fila</option>
            <option value="actualizar">Actualizar datos del cliente</option>
          </Select>
        </Campo>
      </div>

      {estado?.error && <Aviso tono="error">{estado.error}</Aviso>}

      {estado?.importados && (
        <Aviso tono="exito">
          Importación completada: {estado.importados.creados} creados y {estado.importados.actualizados} actualizados.{" "}
          <Link href="/clientes" className="font-medium underline">Ver clientes</Link>
        </Aviso>
      )}

      {r && estado?.modo === "previsualizar" && (
        <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-5">
          <Resumen titulo="Filas" valor={r.total} />
          <Resumen titulo="Nuevos" valor={r.crear} />
          <Resumen titulo="Actualizar" valor={r.actualizar} />
          <Resumen titulo="Omitidos" valor={r.omitir} />
          <Resumen titulo="Con errores" valor={r.conErrores} alerta={r.conErrores > 0} />
        </div>
      )}

      {estado?.filas && estado.filas.length > 0 && (
        <div className="max-h-96 overflow-auto rounded-lg border border-borde">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-fondo text-xs text-texto-suave">
              <tr><th className="p-2">Fila</th><th className="p-2">RUC</th><th className="p-2">Razón social</th><th className="p-2">Resultado</th></tr>
            </thead>
            <tbody className="divide-y divide-borde">
              {estado.filas.map((f) => (
                <tr key={f.numero} className={f.errores.length ? "bg-red-50/50" : ""}>
                  <td className="p-2 text-texto-suave">{f.numero}</td>
                  <td className="p-2 font-mono">{f.datos.ruc}</td>
                  <td className="p-2">{f.datos.razonSocial}</td>
                  <td className="p-2">
                    {f.errores.length ? (
                      <span className="text-red-700">{f.errores.join(" · ")}</span>
                    ) : (
                      <Badge tono={f.accion === "crear" ? "verde" : f.accion === "actualizar" ? "marca" : "neutro"}>
                        {f.accion === "crear" ? "Nuevo" : f.accion === "actualizar" ? "Actualizar" : "Omitir (ya existe)"}
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" variante={listoParaConfirmar ? "secundario" : "primario"} disabled={pendiente} onClick={() => { if (modo.current) modo.current.value = "previsualizar"; }}>
          {pendiente ? "Procesando…" : "Previsualizar"}
        </Button>
        {listoParaConfirmar && (
          <Button type="submit" disabled={pendiente} onClick={() => { if (modo.current) modo.current.value = "confirmar"; }}>
            Importar {r.crear + r.actualizar} cliente(s)
          </Button>
        )}
      </div>
    </Formulario>
  );
}

function Resumen({ titulo, valor, alerta }: { titulo: string; valor: number; alerta?: boolean }) {
  return (
    <div className={`rounded-lg border p-2 ${alerta ? "border-red-200 bg-red-50" : "border-borde"}`}>
      <p className="text-xs text-texto-suave">{titulo}</p>
      <p className="text-lg font-semibold">{valor}</p>
    </div>
  );
}
