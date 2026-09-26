import Link from "next/link";
import { FileText, Plus, Target } from "lucide-react";
import { db } from "@/lib/db";
import type { UsuarioActual } from "@/server/sesion";
import { listarActividades } from "@/server/actividades";
import { NOMBRE_ETAPA } from "@/lib/pipeline";
import { aInputFechaHora } from "@/lib/fechas";
import { formatFecha, formatSoles } from "@/lib/format";
import { Badge, Card, CardTitulo } from "@/components/ui/card";
import { BotonLink } from "@/components/ui/varios";
import { BotonWhatsApp } from "@/components/seguimiento/boton-whatsapp";
import { FormularioActividad } from "@/components/seguimiento/formulario-actividad";
import { ItemActividad } from "@/components/seguimiento/item-actividad";

export async function SeccionesSeguimiento({
  clienteId, usuario, whatsapp, cliente,
}: {
  clienteId: string;
  usuario: UsuarioActual;
  whatsapp: string | null;
  cliente: { razonSocial: string; nombreComercial: string | null; contactoNombre: string | null };
}) {
  const [plantillas, oportunidades, actividades] = await Promise.all([
    db.plantillaWhatsApp.findMany({ where: { activa: true }, select: { id: true, nombre: true, mensaje: true }, orderBy: { nombre: "asc" } }),
    db.oportunidad.findMany({
      where: { clienteId },
      orderBy: [{ fechaCierreReal: { sort: "desc", nulls: "first" } }, { updatedAt: "desc" }],
      take: 8,
    }),
    listarActividades({ clienteId }, { orden: "desc", take: 12, conVendedor: usuario.rol !== "VENDEDOR" }),
  ]);
  const ahora = new Date();

  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {whatsapp ? (
          <BotonWhatsApp
            clienteId={clienteId}
            numero={whatsapp}
            plantillas={plantillas}
            variables={{
              cliente: cliente.nombreComercial || cliente.razonSocial,
              contacto: cliente.contactoNombre?.split(" ")[0] ?? "",
              vendedor: usuario.nombre.split(" ")[0],
              empresa: "Convert",
            }}
          />
        ) : (
          <span className="grid h-11 place-items-center rounded-lg border border-dashed border-borde text-xs text-texto-suave">Sin WhatsApp</span>
        )}
        <BotonLink href={`/cotizaciones/nueva?cliente=${clienteId}`} variante="secundario">
          <FileText className="size-4" aria-hidden /> Cotizar
        </BotonLink>
        <BotonLink href={`/pipeline/nueva?cliente=${clienteId}`} variante="secundario">
          <Target className="size-4" aria-hidden /> Oportunidad
        </BotonLink>
        <BotonLink href={`/agenda/nueva?cliente=${clienteId}`} variante="secundario">
          <Plus className="size-4" aria-hidden /> Actividad
        </BotonLink>
      </div>

      {oportunidades.length > 0 && (
        <Card>
          <CardTitulo>Oportunidades</CardTitulo>
          <ul className="mt-2 divide-y divide-borde text-sm">
            {oportunidades.map((o) => (
              <li key={o.id}>
                <Link href={`/pipeline/${o.id}`} className="flex items-center justify-between gap-2 py-2">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{o.titulo}</span>
                    <span className="text-xs text-texto-suave">Cierre: {formatFecha(o.fechaCierreReal ?? o.fechaCierreProbable)}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block">{formatSoles(o.valorEstimado)}</span>
                    <Badge tono={o.etapa === "GANADO" ? "verde" : o.etapa === "PERDIDO" ? "rojo" : "marca"}>{NOMBRE_ETAPA[o.etapa]}</Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-0 md:p-0">
        <CardTitulo className="border-b border-borde px-4 py-3">Actividades y seguimiento</CardTitulo>
        <ul className="divide-y divide-borde">
          {actividades.map((a) => (
            <ItemActividad key={a.id} a={a} mostrarCliente={false} vencida={!a.completada && a.fechaProgramada < ahora} />
          ))}
          {actividades.length === 0 && <li className="p-4 text-sm text-texto-suave">Sin actividades registradas.</li>}
        </ul>
        <details id="registrar-actividad" className="border-t border-borde p-4">
          <summary className="cursor-pointer text-sm font-medium text-marca-700">Registrar o programar actividad</summary>
          <div className="mt-3">
            <FormularioActividad clienteId={clienteId} ahora={aInputFechaHora(ahora)} />
          </div>
        </details>
      </Card>
    </>
  );
}
