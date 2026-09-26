"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { cambiarEstadoPedido, registrarPago, verificarPago } from "@/server/acciones/pedidos";
import { NOMBRE_ESTADO_PEDIDO, type EstadoPedido } from "@/lib/pedidos";
import { Campo, Input } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/campos";
import { Button } from "@/components/ui/button";
import { BotonEnviar, Formulario, MensajeForm } from "@/components/ui/formulario";

export function FormularioPago({ pedidoId, saldo }: { pedidoId: string; saldo: number }) {
  const [estado, accion, pendiente] = useActionState(registrarPago.bind(null, pedidoId), undefined);
  const e = estado?.errores ?? {};
  return (
    <Formulario accion={accion} pendiente={pendiente} estado={estado} resetAlExito className="grid gap-3 sm:grid-cols-2">
      <Campo label="Monto (S/)" htmlFor="monto" error={e.monto}>
        <Input id="monto" name="monto" type="number" step="0.01" min="0" inputMode="decimal" defaultValue={saldo > 0 ? saldo.toFixed(2) : ""} required />
      </Campo>
      <Campo label="Método" htmlFor="metodo" error={e.metodo}>
        <Select id="metodo" name="metodo" defaultValue="TRANSFERENCIA">
          <option value="TRANSFERENCIA">Transferencia</option>
          <option value="DEPOSITO">Depósito</option>
          <option value="YAPE">Yape</option>
          <option value="PLIN">Plin</option>
          <option value="EFECTIVO">Efectivo</option>
          <option value="OTRO">Otro</option>
        </Select>
      </Campo>
      <Campo label="N° de operación" htmlFor="referencia" error={e.referencia}>
        <Input id="referencia" name="referencia" />
      </Campo>
      <Campo label="Fecha" htmlFor="fechaPago" error={e.fecha}>
        <Input id="fechaPago" name="fecha" type="date" />
      </Campo>
      <div className="space-y-2 sm:col-span-2">
        <MensajeForm estado={estado} />
        <BotonEnviar tamano="sm">Registrar pago</BotonEnviar>
      </div>
    </Formulario>
  );
}

export function BotonVerificarPago({ pagoId }: { pagoId: string }) {
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="flex items-center gap-2">
      {error && <span className="text-xs text-red-700">{error}</span>}
      <Button
        tamano="sm"
        variante="secundario"
        disabled={pendiente}
        onClick={() => startTransition(async () => setError((await verificarPago(pagoId)).error ?? null))}
      >
        Verificar
      </Button>
    </span>
  );
}

const ETIQUETA: Partial<Record<EstadoPedido, string>> = {
  PAGO_VERIFICADO: "Confirmar pago y descontar stock",
  EN_PREPARACION: "Pasar a preparación",
  ENVIADO: "Marcar como enviado",
  ENTREGADO: "Marcar como entregado",
  CANCELADO: "Cancelar pedido",
};

export function FormularioEstado({
  pedidoId, transiciones, agencias, agencia, saldo,
}: { pedidoId: string; transiciones: EstadoPedido[]; agencias: string[]; agencia: string | null; saldo: number }) {
  const [estado, accion, pendiente] = useActionState(cambiarEstadoPedido.bind(null, pedidoId), undefined);
  const [destino, setDestino] = useState<EstadoPedido>(transiciones[0]!);
  const e = estado?.errores ?? {};
  // Tras avanzar de estado cambian las opciones: se propone el siguiente paso.
  const clave = transiciones.join();
  useEffect(() => {
    setDestino(transiciones[0]!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);
  return (
    <Formulario accion={accion} pendiente={pendiente} estado={estado} resetAlExito className="space-y-3">
      <Campo label="Acción" htmlFor="estado">
        <Select id="estado" name="estado" value={destino} onChange={(ev) => setDestino(ev.target.value as EstadoPedido)}>
          {transiciones.map((t) => <option key={t} value={t}>{ETIQUETA[t] ?? NOMBRE_ESTADO_PEDIDO[t]}</option>)}
        </Select>
      </Campo>
      {destino === "PAGO_VERIFICADO" && saldo > 0.01 && (
        <p className="text-xs text-amber-700">Aún falta verificar S/ {saldo.toFixed(2)} en pagos.</p>
      )}
      {destino === "PAGO_VERIFICADO" && (
        <Campo label="Comprobante emitido (opcional)" htmlFor="comprobante">
          <Input id="comprobante" name="comprobante" placeholder="F001-000123" />
        </Campo>
      )}
      {destino === "ENVIADO" && (
        <>
          <Campo label="Agencia" htmlFor="agenciaEnvio" error={e.agenciaEnvio}>
            <Select id="agenciaEnvio" name="agenciaEnvio" defaultValue={agencia ?? ""} required>
              <option value="" disabled>Elige</option>
              {agencias.map((a) => <option key={a}>{a}</option>)}
            </Select>
          </Campo>
          <Campo label="N° de guía" htmlFor="numeroGuia" error={e.numeroGuia}>
            <Input id="numeroGuia" name="numeroGuia" required />
          </Campo>
        </>
      )}
      <Campo label={destino === "CANCELADO" ? "Motivo de cancelación" : "Comentario (opcional)"} htmlFor="comentario" error={e.comentario}>
        <Textarea id="comentario" name="comentario" className="min-h-11" required={destino === "CANCELADO"} />
      </Campo>
      <MensajeForm estado={estado} />
      <BotonEnviar className="w-full" variante={destino === "CANCELADO" ? "peligro" : "primario"}>
        {ETIQUETA[destino] ?? "Actualizar"}
      </BotonEnviar>
    </Formulario>
  );
}
