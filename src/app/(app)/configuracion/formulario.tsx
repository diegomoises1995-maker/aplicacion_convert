"use client";

import { useActionState } from "react";
import { guardarConfiguracion } from "@/server/acciones/configuracion";
import { Campo, Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/campos";
import { BotonEnviar, Formulario, MensajeForm } from "@/components/ui/formulario";

type Config = Record<string, number | boolean | Date>;

export function FormularioConfiguracion({ config }: { config: Config }) {
  const [estado, accion, pendiente] = useActionState(guardarConfiguracion, undefined);
  const e = estado?.errores ?? {};
  const campo = (nombre: string, label: string, ayuda?: string, step = "1") => (
    <Campo label={label} htmlFor={nombre} error={e[nombre]}>
      <Input id={nombre} name={nombre} type="number" step={step} inputMode="decimal" defaultValue={String(config[nombre])} required />
      {ayuda && <p className="mt-1 text-xs text-texto-suave">{ayuda}</p>}
    </Campo>
  );

  return (
    <Formulario accion={accion} pendiente={pendiente} estado={estado} className="space-y-6">
      <Seccion titulo="Ventas y pedidos">
        {campo("igvPorcentaje", "IGV (%)", undefined, "0.01")}
        {campo("pedidoMinimoSeries", "Pedido mínimo (series)")}
        {campo("pedidoMinimoMonto", "Pedido mínimo (S/ sin IGV)", undefined, "0.01")}
        <div className="flex items-end pb-2">
          <Checkbox name="pedidoMinimoCualquiera" defaultChecked={Boolean(config.pedidoMinimoCualquiera)} label="Basta cumplir uno de los dos mínimos" />
        </div>
      </Seccion>
      <Seccion titulo="Descuentos">
        {campo("descuentoMaxVendedor", "Máximo del vendedor (%)", "Sobre este % se pide aprobación del supervisor.", "0.01")}
        {campo("descuentoMaxSupervisor", "Máximo del supervisor (%)", "Sobre este % solo aprueba el gerente.", "0.01")}
      </Seccion>
      <Seccion titulo="Estado de clientes">
        {campo("diasClienteNuevo", "Días como cliente nuevo", "Desde la primera compra.")}
        {campo("factorEnRiesgo", "Factor en riesgo", "En riesgo si lleva más de (frecuencia × factor) días sin comprar.", "0.1")}
        {campo("diasClienteInactivo", "Días para inactivo")}
        {campo("frecuenciaDefectoDias", "Frecuencia por defecto (días)", "Para clientes con una sola compra.")}
      </Seccion>
      <Seccion titulo="Categoría A/B/C (compras 12 meses, sin IGV)">
        {campo("umbralCategoriaA", "Desde S/ (categoría A)", undefined, "0.01")}
        {campo("umbralCategoriaB", "Desde S/ (categoría B)", undefined, "0.01")}
      </Seccion>
      <Seccion titulo="Semáforo de metas (% de avance vs. lo esperado a la fecha)">
        {campo("semaforoVerde", "Verde desde (%)")}
        {campo("semaforoAmarillo", "Amarillo desde (%)")}
      </Seccion>
      <div className="space-y-3">
        <MensajeForm estado={estado} />
        <BotonEnviar>Guardar configuración</BotonEnviar>
      </div>
    </Formulario>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold text-texto-suave">{titulo}</legend>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </fieldset>
  );
}
