"use client";

import { useActionState, useState, useTransition } from "react";
import { Mail, Share2 } from "lucide-react";
import { cambiarEstadoCotizacion, convertirEnPedido, resolverAprobacion } from "@/server/acciones/cotizaciones";
import { enlaceWhatsApp } from "@/lib/whatsapp";
import { Campo, Input } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/campos";
import { Button } from "@/components/ui/button";
import { BotonEnviar, Formulario, MensajeForm } from "@/components/ui/formulario";
import { IconoWhatsApp } from "@/components/whatsapp";

export function Compartir({
  id, numero, whatsapp, email, resumen, marcarEnviada,
}: { id: string; numero: number; whatsapp: string | null; email: string | null; resumen: string; marcarEnviada: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);

  const alCompartir = () => {
    if (marcarEnviada) void cambiarEstadoCotizacion(id, "ENVIADA");
  };

  // En celulares con Web Share API se comparte el PDF como archivo (WhatsApp, correo, etc.).
  async function compartirPdf() {
    try {
      const r = await fetch(`/api/cotizaciones/${id}/pdf`);
      const blob = await r.blob();
      const archivo = new File([blob], `cotizacion-${numero}.pdf`, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ files: [archivo], title: `Cotización #${numero}`, text: resumen });
        alCompartir();
        return;
      }
      setMsg("Tu navegador no permite compartir archivos: descarga el PDF y adjúntalo.");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setMsg("No se pudo compartir el PDF.");
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variante="secundario" className="w-full" onClick={compartirPdf}>
        <Share2 className="size-4" aria-hidden /> Compartir PDF
      </Button>
      {whatsapp && (
        <a
          href={enlaceWhatsApp(whatsapp, resumen)}
          target="_blank"
          rel="noopener"
          onClick={alCompartir}
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <IconoWhatsApp className="size-5" /> Enviar resumen por WhatsApp
        </a>
      )}
      {email && (
        <a
          href={`mailto:${email}?subject=${encodeURIComponent(`Cotización #${numero} – Convert`)}&body=${encodeURIComponent(resumen + "\n\nAdjuntamos el PDF de la cotización.")}`}
          onClick={alCompartir}
          className="flex h-11 items-center justify-center gap-2 rounded-lg border border-borde bg-superficie text-sm font-medium hover:bg-fondo"
        >
          <Mail className="size-4" aria-hidden /> Enviar por correo
        </a>
      )}
      {msg && <p className="text-xs text-amber-700">{msg}</p>}
    </div>
  );
}

export function AccionesEstado({ id, estado }: { id: string; estado: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const cambiar = (e: "ENVIADA" | "ACEPTADA" | "RECHAZADA") =>
    startTransition(async () => {
      const r = await cambiarEstadoCotizacion(id, e);
      setError(r.error ?? null);
    });
  const opciones: Record<string, ("ENVIADA" | "ACEPTADA" | "RECHAZADA")[]> = {
    BORRADOR: ["ENVIADA", "ACEPTADA", "RECHAZADA"],
    ENVIADA: ["ACEPTADA", "RECHAZADA"],
    ACEPTADA: ["RECHAZADA"],
  };
  const nombres = { ENVIADA: "Marcar enviada", ACEPTADA: "Cliente aceptó", RECHAZADA: "Cliente rechazó" };
  if (!opciones[estado]) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-borde pt-4">
      {opciones[estado].map((e) => (
        <Button key={e} tamano="sm" variante={e === "RECHAZADA" ? "fantasma" : "secundario"} disabled={pendiente} onClick={() => cambiar(e)}>
          {nombres[e]}
        </Button>
      ))}
      {error && <p className="w-full text-sm text-red-700">{error}</p>}
    </div>
  );
}

export function FormularioAprobacion({ aprobacionId }: { aprobacionId: string }) {
  const [estado, accion, pendiente] = useActionState(resolverAprobacion.bind(null, aprobacionId), undefined);
  return (
    <Formulario accion={accion} pendiente={pendiente} className="space-y-3">
      <Campo label="Comentario (obligatorio si rechazas)" htmlFor={`com-${aprobacionId}`} error={estado?.errores?.comentario}>
        <Textarea id={`com-${aprobacionId}`} name="comentario" className="min-h-11" />
      </Campo>
      <MensajeForm estado={estado} />
      <div className="flex gap-2">
        <Button type="submit" name="decision" value="aprobar" disabled={pendiente}>Aprobar descuento</Button>
        <Button type="submit" name="decision" value="rechazar" variante="peligro" disabled={pendiente}>Rechazar</Button>
      </div>
    </Formulario>
  );
}

export function FormularioConvertir({ id, agencias, direccion }: { id: string; agencias: string[]; direccion: string }) {
  const [estado, accion, pendiente] = useActionState(convertirEnPedido.bind(null, id), undefined);
  return (
    <Formulario accion={accion} pendiente={pendiente} className="space-y-3">
      <Campo label="Dirección de envío" htmlFor="direccionEnvio">
        <Input id="direccionEnvio" name="direccionEnvio" defaultValue={direccion} />
      </Campo>
      <Campo label="Agencia de transporte" htmlFor="agenciaEnvio">
        <Select id="agenciaEnvio" name="agenciaEnvio" defaultValue="">
          <option value="">Por definir</option>
          {agencias.map((a) => <option key={a}>{a}</option>)}
        </Select>
      </Campo>
      <Campo label="Notas del pedido" htmlFor="notasPedido">
        <Textarea id="notasPedido" name="notas" className="min-h-11" />
      </Campo>
      <MensajeForm estado={estado} />
      <BotonEnviar className="w-full" pendiente="Creando pedido…">Crear pedido</BotonEnviar>
    </Formulario>
  );
}
