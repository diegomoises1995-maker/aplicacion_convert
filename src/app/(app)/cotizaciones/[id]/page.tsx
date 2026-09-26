import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Copy, Download } from "lucide-react";
import { db } from "@/lib/db";
import { getAlcance, requireUsuario } from "@/server/sesion";
import { getConfiguracion } from "@/server/configuracion";
import { alcanceIncluye } from "@/lib/alcance";
import { tienePermiso } from "@/lib/permisos";
import { puedeAprobar } from "@/lib/precios";
import { numeroWhatsApp } from "@/lib/clientes";
import { AGENCIAS_ENVIO } from "@/lib/pedidos";
import { NOMBRE_ESTADO_COTIZACION, TONO_ESTADO_COTIZACION, estadoVisible } from "@/lib/cotizaciones";
import { formatFecha, formatSoles } from "@/lib/format";
import { Badge, Card, CardTitulo, EncabezadoPagina } from "@/components/ui/card";
import { Aviso, BotonLink, Dato } from "@/components/ui/varios";
import { FotoModelo } from "@/components/foto-modelo";
import { AccionesEstado, Compartir, FormularioAprobacion, FormularioConvertir } from "./acciones";

export const metadata: Metadata = { title: "Cotización" };

export default async function CotizacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await requireUsuario();
  const c = await db.cotizacion.findUnique({
    where: { id },
    include: {
      cliente: true,
      vendedor: { select: { nombre: true, telefono: true, email: true } },
      oportunidad: { select: { id: true, titulo: true } },
      items: { include: { modelo: { select: { nombre: true, sku: true, fotos: true } }, color: { select: { nombre: true } } } },
      aprobaciones: { include: { solicitante: { select: { nombre: true } }, aprobador: { select: { nombre: true } } }, orderBy: { createdAt: "desc" } },
      pedido: { select: { id: true, numero: true } },
    },
  });
  if (!c || !alcanceIncluye(await getAlcance(usuario), c.vendedorId)) notFound();

  const config = await getConfiguracion();
  const ev = estadoVisible(c.estado, c.validaHasta);
  const pendiente = c.aprobaciones.find((a) => a.estado === "PENDIENTE");
  const puedeResolver = pendiente && tienePermiso(usuario.rol, "descuentos.aprobar");
  const alcanzaLimite = pendiente && puedeAprobar(usuario.rol, Number(pendiente.descuentoSolicitado), config);
  const convertible = ["BORRADOR", "ENVIADA", "ACEPTADA"].includes(c.estado) && ev !== "VENCIDA";
  const nombreCliente = c.cliente.nombreComercial || c.cliente.razonSocial;
  const resumen =
    `Cotización #${c.numero} – Convert\n${nombreCliente}\n` +
    c.items.map((i) => `• ${i.modelo.nombre} ${i.color.nombre}: ${i.series} series (${i.pares} pares)`).join("\n") +
    `\nTotal: ${formatSoles(c.total)} (inc. IGV)\nVálida hasta ${formatFecha(c.validaHasta)}`;

  return (
    <>
      <EncabezadoPagina
        titulo={`Cotización #${c.numero}`}
        descripcion={`${nombreCliente} · ${formatFecha(c.createdAt)} · ${c.vendedor.nombre}`}
        acciones={<Badge tono={TONO_ESTADO_COTIZACION[ev]}>{NOMBRE_ESTADO_COTIZACION[ev]}</Badge>}
      />

      {pendiente && (
        <div className="mb-4">
          <Aviso tono="alerta">
            {pendiente.solicitante.nombre} solicitó un descuento de <strong>{String(pendiente.descuentoSolicitado)} %</strong>.
            {!puedeResolver && " Queda pendiente de aprobación."}
            {puedeResolver && !alcanzaLimite && " Supera tu límite: debe aprobarlo el gerente."}
          </Aviso>
          {puedeResolver && alcanzaLimite && <Card className="mt-2"><FormularioAprobacion aprobacionId={pendiente.id} /></Card>}
        </div>
      )}
      {c.pedido && (
        <div className="mb-4"><Aviso tono="exito">Convertida en el <Link className="font-medium underline" href={`/pedidos/${c.pedido.id}`}>pedido #{c.pedido.numero}</Link>.</Aviso></div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-0 md:p-0">
            <ul className="divide-y divide-borde">
              {c.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 p-3 md:px-4">
                  <FotoModelo src={i.modelo.fotos[0]} alt={i.modelo.nombre} className="size-14 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{i.modelo.nombre} · {i.color.nombre}</p>
                    <p className="text-xs text-texto-suave">{i.modelo.sku} · {i.series} series · {i.pares} pares × {formatSoles(i.precioPar)}</p>
                  </div>
                  <p className="font-medium">{formatSoles(i.subtotal)}</p>
                </li>
              ))}
            </ul>
            <dl className="space-y-1 border-t border-borde p-4 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatSoles(c.subtotal)}</dd></div>
              {Number(c.descuentoVolumen) > 0 && <div className="flex justify-between text-emerald-700"><dt>Descuento por volumen</dt><dd>−{formatSoles(c.descuentoVolumen)}</dd></div>}
              {Number(c.descuentoMonto) > 0 && <div className="flex justify-between text-emerald-700"><dt>Descuento adicional ({String(c.descuentoPorcentaje)} %)</dt><dd>−{formatSoles(c.descuentoMonto)}</dd></div>}
              <div className="flex justify-between"><dt>Base imponible</dt><dd>{formatSoles(c.baseImponible)}</dd></div>
              <div className="flex justify-between"><dt>IGV ({config.igvPorcentaje} %)</dt><dd>{formatSoles(c.igv)}</dd></div>
              <div className="flex justify-between text-lg font-semibold"><dt>Total</dt><dd>{formatSoles(c.total)}</dd></div>
            </dl>
          </Card>
          {c.notas && <Card><CardTitulo>Notas</CardTitulo><p className="mt-1 whitespace-pre-line text-sm">{c.notas}</p></Card>}
          {c.aprobaciones.length > 0 && (
            <Card>
              <CardTitulo>Aprobaciones</CardTitulo>
              <ul className="mt-2 space-y-1 text-sm">
                {c.aprobaciones.map((a) => (
                  <li key={a.id}>
                    {String(a.descuentoSolicitado)} % · {a.estado === "PENDIENTE" ? "Pendiente" : `${a.estado === "APROBADA" ? "Aprobada" : "Rechazada"} por ${a.aprobador?.nombre} (${formatFecha(a.resueltaAt, true)})`}
                    {a.comentario && <span className="text-texto-suave"> – {a.comentario}</span>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="space-y-3">
            <CardTitulo>Compartir</CardTitulo>
            <a href={`/api/cotizaciones/${c.id}/pdf`} target="_blank" className="flex h-11 items-center justify-center gap-2 rounded-lg border border-borde bg-superficie text-sm font-medium hover:bg-fondo">
              <Download className="size-4" aria-hidden /> Descargar PDF
            </a>
            <Compartir
              id={c.id}
              numero={c.numero}
              whatsapp={numeroWhatsApp(c.cliente.whatsapp ?? c.cliente.telefono)}
              email={c.cliente.email}
              resumen={resumen}
              marcarEnviada={c.estado === "BORRADOR"}
            />
            <BotonLink href={`/cotizaciones/nueva?desde=${c.id}`} variante="secundario" className="w-full">
              <Copy className="size-4" aria-hidden /> Duplicar / actualizar
            </BotonLink>
          </Card>
          <Card>
            <dl className="space-y-2">
              <Dato etiqueta="Cliente"><Link className="text-marca-700" href={`/clientes/${c.clienteId}`}>{c.cliente.razonSocial}</Link></Dato>
              <Dato etiqueta="Válida hasta">{formatFecha(c.validaHasta)}</Dato>
              {c.oportunidad && <Dato etiqueta="Oportunidad"><Link className="text-marca-700" href={`/pipeline/${c.oportunidad.id}`}>{c.oportunidad.titulo}</Link></Dato>}
            </dl>
            <AccionesEstado id={c.id} estado={c.estado} />
          </Card>
          {convertible && (
            <Card>
              <CardTitulo className="mb-3">Convertir en pedido</CardTitulo>
              <FormularioConvertir
                id={c.id}
                agencias={AGENCIAS_ENVIO}
                direccion={[c.cliente.direccion, c.cliente.distrito, c.cliente.ciudad].filter(Boolean).join(", ")}
              />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
