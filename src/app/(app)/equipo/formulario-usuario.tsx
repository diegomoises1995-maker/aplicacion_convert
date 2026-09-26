"use client";

import { useActionState, useState } from "react";
import { guardarUsuario } from "@/server/acciones/usuarios";
import { Campo, Input } from "@/components/ui/input";
import { Checkbox, Select } from "@/components/ui/campos";
import { BotonEnviar, Formulario, MensajeForm } from "@/components/ui/formulario";

type Opcion = { id: string; nombre: string };
type Usuario = {
  id: string; nombre: string; email: string; telefono: string | null; dni: string | null;
  rol: string; canal: string; zonaId: string | null; supervisorId: string | null; activo: boolean;
};

export function FormularioUsuario({ usuario, zonas, supervisores }: { usuario?: Usuario; zonas: Opcion[]; supervisores: Opcion[] }) {
  const [estado, accion, pendiente] = useActionState(guardarUsuario.bind(null, usuario?.id ?? null), undefined);
  const [rol, setRol] = useState(usuario?.rol ?? "VENDEDOR");
  const e = estado?.errores ?? {};

  return (
    <Formulario accion={accion} pendiente={pendiente} estado={estado} className="grid gap-4 md:grid-cols-2">
      <Campo label="Nombre completo" htmlFor="nombre" error={e.nombre}>
        <Input id="nombre" name="nombre" defaultValue={usuario?.nombre} required />
      </Campo>
      <Campo label="Correo (para ingresar)" htmlFor="email" error={e.email}>
        <Input id="email" name="email" type="email" defaultValue={usuario?.email} required />
      </Campo>
      <Campo label="Celular" htmlFor="telefono" error={e.telefono}>
        <Input id="telefono" name="telefono" inputMode="tel" defaultValue={usuario?.telefono ?? ""} />
      </Campo>
      <Campo label="DNI" htmlFor="dni" error={e.dni}>
        <Input id="dni" name="dni" inputMode="numeric" maxLength={8} defaultValue={usuario?.dni ?? ""} />
      </Campo>
      <Campo label="Rol" htmlFor="rol" error={e.rol}>
        <Select id="rol" name="rol" value={rol} onChange={(ev) => setRol(ev.target.value)}>
          <option value="VENDEDOR">Vendedor</option>
          <option value="SUPERVISOR">Supervisor</option>
          <option value="ADMIN">Gerente / Administrador</option>
        </Select>
      </Campo>
      <Campo label="Canal de venta" htmlFor="canal" error={e.canal}>
        <Select id="canal" name="canal" defaultValue={usuario?.canal ?? "MIXTO"}>
          <option value="CAMPO">Campo (visitas)</option>
          <option value="REMOTO">WhatsApp / teléfono</option>
          <option value="MIXTO">Mixto</option>
        </Select>
      </Campo>
      <Campo label="Zona / territorio" htmlFor="zonaId" error={e.zonaId}>
        <Select id="zonaId" name="zonaId" defaultValue={usuario?.zonaId ?? ""}>
          <option value="">Sin zona</option>
          {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
        </Select>
      </Campo>
      {rol === "VENDEDOR" && (
        <Campo label="Supervisor" htmlFor="supervisorId" error={e.supervisorId}>
          <Select id="supervisorId" name="supervisorId" defaultValue={usuario?.supervisorId ?? ""}>
            <option value="">Sin supervisor</option>
            {supervisores.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </Select>
        </Campo>
      )}
      {!usuario && (
        <Campo label="Contraseña inicial" htmlFor="password" error={e.password}>
          <Input id="password" name="password" type="text" autoComplete="off" placeholder="Mín. 8 caracteres, letras y números" required />
        </Campo>
      )}
      {usuario && (
        <div className="flex items-end pb-2">
          <Checkbox name="activo" defaultChecked={usuario.activo} label="Usuario activo (puede ingresar)" />
        </div>
      )}
      <div className="space-y-3 md:col-span-2">
        <MensajeForm estado={estado} />
        <BotonEnviar>{usuario ? "Guardar cambios" : "Crear usuario"}</BotonEnviar>
      </div>
    </Formulario>
  );
}
