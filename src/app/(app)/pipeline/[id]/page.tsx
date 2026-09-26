import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { db } from "@/lib/db";
import { getAlcance, requireUsuario } from "@/server/sesion";
import { listarActividades } from "@/server/actividades";
import { alcanceIncluye } from "@/lib/alcance";
import { NOMBRE_ETAPA } from "@/lib/pipeline";
import { aInputFecha, aInputFechaHora } from "@/lib/fechas";
import { formatFecha, formatSoles } from "@/lib/format";
import { Badge, Card, CardTitulo, EncabezadoPagina } from "@/components/ui/card";
import { BotonLink } from "@/components/ui/varios";
import { FormularioActividad } from "@/components/seguimiento/formulario-actividad";
import { ItemActividad } from "@/components/seguimiento/item-actividad";
import { FormularioOportunidad } from "../formulario-oportunidad";
import { opcionesClientes } from "../clientes-opciones";

export const metadata: Metadata = { title: "Oportunidad" };

export default async function OportunidadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await requireUsuario();
  const op = await db.oportunidad.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, razonSocial: true, nombreComercial: true } },
      vendedor: { select: { nombre: true } },
      cotizaciones: { select: { id: true, numero: true, total: true, estado: true, createdAt: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!op || !alcanceIncluye(await getAlcance(usuario), op.vendedorId)) notFound();
  const [clientes, actividades] = await Promise.all([
    opcionesClientes(usuario),
    listarActividades({ oportunidadId: id }, { orden: "desc" }),
  ]);

  return (
    <>
      <EncabezadoPagina
        titulo={op.titulo}
        descripcion={`${op.cliente.nombreComercial || op.cliente.razonSocial} · ${op.vendedor.nombre}`}
        acciones={
          <BotonLink href={`/cotizaciones/nueva?cliente=${op.clienteId}&oportunidad=${op.id}`} variante="secundario">
            <FileText className="size-4" aria-hidden /> Cotizar
          </BotonLink>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <Badge tono={op.etapa === "GANADO" ? "verde" : op.etapa === "PERDIDO" ? "rojo" : "marca"}>{NOMBRE_ETAPA[op.etapa]}</Badge>
        <span className="font-semibold">{formatSoles(op.valorEstimado)}</span>
        {op.motivoPerdida && <span className="text-red-700">Motivo: {op.motivoPerdida}</span>}
        <Link href={`/clientes/${op.clienteId}`} className="text-marca-700">Ver cliente →</Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <FormularioOportunidad
            clientes={clientes}
            op={{
              id: op.id, titulo: op.titulo, clienteId: op.clienteId, etapa: op.etapa, valorEstimado: Number(op.valorEstimado),
              paresEstimados: op.paresEstimados, fechaCierreProbable: aInputFecha(op.fechaCierreProbable),
              motivoPerdida: op.motivoPerdida, notas: op.notas,
            }}
          />
        </Card>
        <div className="space-y-4">
          <Card>
            <CardTitulo>Cotizaciones</CardTitulo>
            <ul className="mt-2 divide-y divide-borde text-sm">
              {op.cotizaciones.map((c) => (
                <li key={c.id} className="py-2">
                  <Link href={`/cotizaciones/${c.id}`} className="flex justify-between text-marca-700">
                    <span>#{c.numero} · {formatFecha(c.createdAt)}</span><span>{formatSoles(c.total)}</span>
                  </Link>
                </li>
              ))}
              {op.cotizaciones.length === 0 && <li className="py-2 text-texto-suave">Sin cotizaciones.</li>}
            </ul>
          </Card>
          <Card className="p-0 md:p-0">
            <CardTitulo className="border-b border-borde px-4 py-3">Actividades</CardTitulo>
            <ul className="divide-y divide-borde">
              {actividades.map((a) => <ItemActividad key={a.id} a={a} mostrarCliente={false} />)}
              {actividades.length === 0 && <li className="p-4 text-sm text-texto-suave">Sin actividades.</li>}
            </ul>
            <details className="border-t border-borde p-4">
              <summary className="cursor-pointer text-sm font-medium text-marca-700">Registrar actividad</summary>
              <div className="mt-3">
                <FormularioActividad clienteId={op.clienteId} oportunidadId={op.id} ahora={aInputFechaHora(new Date())} />
              </div>
            </details>
          </Card>
        </div>
      </div>
    </>
  );
}
