"use client";

import { useActionState } from "react";
import { guardarCliente } from "@/server/acciones/clientes";
import { Campo, Input } from "@/components/ui/input";
import { Checkbox, Select, Textarea } from "@/components/ui/campos";
import { BotonEnviar, Formulario, MensajeForm } from "@/components/ui/formulario";

type Opcion = { id: string; nombre: string };
export type ClienteForm = {
  id: string; ruc: string; razonSocial: string; nombreComercial: string | null; tipo: string; categoria: string;
  categoriaManual: boolean; contactoNombre: string | null; telefono: string | null; whatsapp: string | null;
  email: string | null; direccion: string | null; distrito: string | null; ciudad: string; departamento: string | null;
  zonaId: string | null; vendedorId: string | null; listaPrecioId: string | null; notas: string | null;
};

export function FormularioCliente({
  cliente, zonas, vendedores, listas, puedeAsignar, puedeCategorizar, vendedorDefecto,
}: {
  cliente?: ClienteForm; zonas: Opcion[]; vendedores: Opcion[]; listas: Opcion[];
  puedeAsignar: boolean; puedeCategorizar: boolean; vendedorDefecto?: string;
}) {
  const [estado, accion, pendiente] = useActionState(guardarCliente.bind(null, cliente?.id ?? null), undefined);
  const e = estado?.errores ?? {};

  return (
    <Formulario accion={accion} pendiente={pendiente} estado={estado} className="space-y-6">
      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-texto-suave">Empresa</legend>
        <Campo label="RUC" htmlFor="ruc" error={e.ruc}>
          <Input id="ruc" name="ruc" inputMode="numeric" maxLength={11} defaultValue={cliente?.ruc} required placeholder="11 dígitos" />
        </Campo>
        <Campo label="Razón social" htmlFor="razonSocial" error={e.razonSocial}>
          <Input id="razonSocial" name="razonSocial" defaultValue={cliente?.razonSocial} required />
        </Campo>
        <Campo label="Nombre comercial" htmlFor="nombreComercial" error={e.nombreComercial}>
          <Input id="nombreComercial" name="nombreComercial" defaultValue={cliente?.nombreComercial ?? ""} />
        </Campo>
        <Campo label="Tipo de cliente" htmlFor="tipo" error={e.tipo}>
          <Select id="tipo" name="tipo" defaultValue={cliente?.tipo ?? "TIENDA"}>
            <option value="TIENDA">Tienda</option>
            <option value="REVENDEDOR">Revendedor</option>
            <option value="DISTRIBUIDOR">Distribuidor</option>
            <option value="OTRO">Otro</option>
          </Select>
        </Campo>
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-texto-suave">Contacto</legend>
        <Campo label="Nombre del contacto" htmlFor="contactoNombre" error={e.contactoNombre}>
          <Input id="contactoNombre" name="contactoNombre" defaultValue={cliente?.contactoNombre ?? ""} />
        </Campo>
        <Campo label="Teléfono" htmlFor="telefono" error={e.telefono}>
          <Input id="telefono" name="telefono" inputMode="tel" defaultValue={cliente?.telefono ?? ""} />
        </Campo>
        <Campo label="WhatsApp" htmlFor="whatsapp" error={e.whatsapp}>
          <Input id="whatsapp" name="whatsapp" inputMode="tel" defaultValue={cliente?.whatsapp ?? ""} placeholder="Si se deja vacío se usa el teléfono" />
        </Campo>
        <Campo label="Correo" htmlFor="email" error={e.email}>
          <Input id="email" name="email" type="email" defaultValue={cliente?.email ?? ""} />
        </Campo>
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-texto-suave">Ubicación</legend>
        <Campo label="Dirección" htmlFor="direccion" error={e.direccion}>
          <Input id="direccion" name="direccion" defaultValue={cliente?.direccion ?? ""} />
        </Campo>
        <Campo label="Distrito" htmlFor="distrito" error={e.distrito}>
          <Input id="distrito" name="distrito" defaultValue={cliente?.distrito ?? ""} />
        </Campo>
        <Campo label="Ciudad" htmlFor="ciudad" error={e.ciudad}>
          <Input id="ciudad" name="ciudad" defaultValue={cliente?.ciudad ?? "Lima"} required />
        </Campo>
        <Campo label="Departamento" htmlFor="departamento" error={e.departamento}>
          <Input id="departamento" name="departamento" defaultValue={cliente?.departamento ?? ""} />
        </Campo>
        <Campo label="Zona" htmlFor="zonaId" error={e.zonaId}>
          <Select id="zonaId" name="zonaId" defaultValue={cliente?.zonaId ?? ""}>
            <option value="">Sin zona</option>
            {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
          </Select>
        </Campo>
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-texto-suave">Comercial</legend>
        {puedeAsignar && (
          <Campo label="Vendedor asignado" htmlFor="vendedorId" error={e.vendedorId}>
            <Select id="vendedorId" name="vendedorId" defaultValue={cliente ? (cliente.vendedorId ?? "") : (vendedorDefecto ?? "")}>
              <option value="">Sin asignar</option>
              {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </Select>
          </Campo>
        )}
        {puedeCategorizar && (
          <>
            <Campo label="Lista de precios" htmlFor="listaPrecioId" error={e.listaPrecioId}>
              <Select id="listaPrecioId" name="listaPrecioId" defaultValue={cliente?.listaPrecioId ?? ""}>
                <option value="">Según tipo de cliente</option>
                {listas.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </Select>
            </Campo>
            <Campo label="Categoría" htmlFor="categoria" error={e.categoria}>
              <Select id="categoria" name="categoria" defaultValue={cliente?.categoria ?? "C"}>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </Select>
            </Campo>
            <div className="flex items-end pb-2">
              <Checkbox name="categoriaManual" defaultChecked={cliente?.categoriaManual} label="Fijar categoría (no recalcular por volumen)" />
            </div>
          </>
        )}
        <div className="md:col-span-2">
          <Campo label="Notas" htmlFor="notas" error={e.notas}>
            <Textarea id="notas" name="notas" defaultValue={cliente?.notas ?? ""} />
          </Campo>
        </div>
      </fieldset>

      <div className="space-y-3">
        <MensajeForm estado={estado} />
        <BotonEnviar className="w-full md:w-auto">{cliente ? "Guardar cambios" : "Registrar cliente"}</BotonEnviar>
      </div>
    </Formulario>
  );
}
