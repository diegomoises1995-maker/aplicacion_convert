"use client";

import { useActionState } from "react";
import { guardarModelo } from "@/server/acciones/catalogo";
import { NOMBRE_GENERO } from "@/lib/catalogo";
import { Campo, Input } from "@/components/ui/input";
import { Checkbox, Select, Textarea } from "@/components/ui/campos";
import { BotonEnviar, Formulario, MensajeForm } from "@/components/ui/formulario";

type Modelo = {
  id: string; sku: string; nombre: string; descripcion: string | null; genero: string; material: string;
  precioBase: number; costo: number | null; curvaId: string; fotos: string[]; activo: boolean;
};

export function FormularioModelo({ modelo, curvas }: { modelo?: Modelo; curvas: { id: string; nombre: string }[] }) {
  const [estado, accion, pendiente] = useActionState(guardarModelo.bind(null, modelo?.id ?? null), undefined);
  const e = estado?.errores ?? {};
  return (
    <Formulario accion={accion} pendiente={pendiente} className="grid gap-4 md:grid-cols-2">
      <Campo label="SKU" htmlFor="sku" error={e.sku}>
        <Input id="sku" name="sku" defaultValue={modelo?.sku} placeholder="CV-URB-01" required />
      </Campo>
      <Campo label="Nombre" htmlFor="nombre" error={e.nombre}>
        <Input id="nombre" name="nombre" defaultValue={modelo?.nombre} required />
      </Campo>
      <Campo label="Género" htmlFor="genero" error={e.genero}>
        <Select id="genero" name="genero" defaultValue={modelo?.genero ?? "CABALLERO"}>
          {Object.entries(NOMBRE_GENERO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Campo>
      <Campo label="Curva de tallas (serie)" htmlFor="curvaId" error={e.curvaId}>
        <Select id="curvaId" name="curvaId" defaultValue={modelo?.curvaId ?? ""} required>
          <option value="" disabled>Elige una curva</option>
          {curvas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </Select>
      </Campo>
      <Campo label="Precio base por par (S/ sin IGV)" htmlFor="precioBase" error={e.precioBase}>
        <Input id="precioBase" name="precioBase" type="number" step="0.01" min="0" inputMode="decimal" defaultValue={modelo?.precioBase} required />
      </Campo>
      <Campo label="Costo por par (opcional, solo gerencia)" htmlFor="costo" error={e.costo}>
        <Input id="costo" name="costo" type="number" step="0.01" min="0" inputMode="decimal" defaultValue={modelo?.costo ?? ""} />
      </Campo>
      <Campo label="Material" htmlFor="material" error={e.material}>
        <Input id="material" name="material" defaultValue={modelo?.material ?? "Cuero"} />
      </Campo>
      <Campo label="Fotos (una URL por línea)" htmlFor="fotos" error={e.fotos}>
        <Textarea id="fotos" name="fotos" defaultValue={modelo?.fotos.join("\n")} placeholder="https://… o /catalogo/archivo.jpg" />
      </Campo>
      <div className="md:col-span-2">
        <Campo label="Descripción" htmlFor="descripcion" error={e.descripcion}>
          <Textarea id="descripcion" name="descripcion" defaultValue={modelo?.descripcion ?? ""} />
        </Campo>
      </div>
      {modelo && <Checkbox name="activo" defaultChecked={modelo.activo} label="Modelo activo (visible para cotizar)" />}
      <div className="space-y-3 md:col-span-2">
        <MensajeForm estado={estado} />
        <BotonEnviar>{modelo ? "Guardar modelo" : "Crear modelo"}</BotonEnviar>
      </div>
    </Formulario>
  );
}
