import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, MapPin, Pencil, Phone } from "lucide-react";
import { db } from "@/lib/db";
import { requireUsuario } from "@/server/sesion";
import { puedeVerCliente, vendedoresAsignables } from "@/server/clientes";
import { tienePermiso } from "@/lib/permisos";
import { NOMBRE_ESTADO, NOMBRE_TIPO_CLIENTE, TONO_ESTADO, numeroWhatsApp } from "@/lib/clientes";
import { NOMBRE_ESTADO_PEDIDO, TONO_ESTADO_PEDIDO } from "@/lib/pedidos";
import { diasEntre } from "@/lib/fechas";
import { formatFecha, formatSoles } from "@/lib/format";
import { Badge, Card, CardTitulo, EncabezadoPagina } from "@/components/ui/card";
import { BotonLink, Dato } from "@/components/ui/varios";
import { FormularioReasignarCliente } from "./reasignar";
import { SeccionesSeguimiento } from "./seguimiento";

export const metadata: Metadata = { title: "Cliente" };

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await requireUsuario();
  const cliente = await db.cliente.findUnique({
    where: { id },
    include: {
      vendedor: { select: { id: true, nombre: true } },
      zona: { select: { nombre: true } },
      listaPrecio: { select: { nombre: true } },
      pedidos: {
        orderBy: { fecha: "desc" },
        take: 15,
        select: { id: true, numero: true, fecha: true, estado: true, total: true, totalPares: true, totalSeries: true },
      },
      historialAsignacion: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          desdeVendedor: { select: { nombre: true } },
          haciaVendedor: { select: { nombre: true } },
          asignadoPor: { select: { nombre: true } },
        },
      },
    },
  });
  if (!cliente || !(await puedeVerCliente(usuario, cliente))) notFound();

  const puedeReasignar = tienePermiso(usuario.rol, "clientes.reasignar");
  const vendedores = puedeReasignar ? await vendedoresAsignables(usuario) : [];
  const wa = numeroWhatsApp(cliente.whatsapp ?? cliente.telefono);
  const diasSinComprar = cliente.ultimaCompra ? diasEntre(cliente.ultimaCompra, new Date()) : null;

  return (
    <>
      <EncabezadoPagina
        titulo={cliente.nombreComercial || cliente.razonSocial}
        descripcion={`${cliente.razonSocial} · RUC ${cliente.ruc}`}
        acciones={
          <BotonLink href={`/clientes/${cliente.id}/editar`} variante="secundario">
            <Pencil className="size-4" aria-hidden /> Editar
          </BotonLink>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tono={TONO_ESTADO[cliente.estado]}>{NOMBRE_ESTADO[cliente.estado]}</Badge>
        <Badge>Categoría {cliente.categoria}{cliente.categoriaManual ? " (fija)" : ""}</Badge>
        <Badge>{NOMBRE_TIPO_CLIENTE[cliente.tipo]}</Badge>
        {cliente.listaPrecio && <Badge tono="marca">{cliente.listaPrecio.nombre}</Badge>}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card><p className="text-xs text-texto-suave">Ticket promedio</p><p className="mt-1 text-lg font-semibold">{formatSoles(cliente.ticketPromedio)}</p></Card>
            <Card><p className="text-xs text-texto-suave">Compras 12 meses</p><p className="mt-1 text-lg font-semibold">{formatSoles(cliente.totalComprado12m)}</p></Card>
            <Card><p className="text-xs text-texto-suave">Pedidos</p><p className="mt-1 text-lg font-semibold">{cliente.numeroPedidos}</p></Card>
            <Card>
              <p className="text-xs text-texto-suave">Frecuencia</p>
              <p className="mt-1 text-lg font-semibold">{cliente.frecuenciaDias ? `c/ ${cliente.frecuenciaDias} días` : "—"}</p>
              {diasSinComprar !== null && <p className="text-xs text-texto-suave">{diasSinComprar} días sin comprar</p>}
            </Card>
          </div>

          <SeccionesSeguimiento clienteId={cliente.id} usuario={usuario} whatsapp={wa} cliente={cliente} />

          <Card>
            <div className="flex items-center justify-between">
              <CardTitulo>Historial de compras</CardTitulo>
              <Link href={`/pedidos?cliente=${cliente.id}`} className="text-sm text-marca-700">Ver todos →</Link>
            </div>
            <ul className="mt-2 divide-y divide-borde text-sm">
              {cliente.pedidos.map((p) => (
                <li key={p.id}>
                  <Link href={`/pedidos/${p.id}`} className="flex items-center justify-between gap-2 py-2">
                    <span>
                      <span className="font-medium">Pedido #{p.numero}</span>
                      <span className="block text-xs text-texto-suave">
                        {formatFecha(p.fecha)} · {p.totalSeries} series · {p.totalPares} pares
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block font-medium">{formatSoles(p.total)}</span>
                      <Badge tono={TONO_ESTADO_PEDIDO[p.estado]}>{NOMBRE_ESTADO_PEDIDO[p.estado]}</Badge>
                    </span>
                  </Link>
                </li>
              ))}
              {cliente.pedidos.length === 0 && <li className="py-2 text-texto-suave">Aún no tiene pedidos.</li>}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardTitulo>Contacto</CardTitulo>
            <dl className="mt-3 space-y-3">
              <Dato etiqueta="Contacto">{cliente.contactoNombre ?? "—"}</Dato>
              {cliente.telefono && (
                <Dato etiqueta="Teléfono">
                  <a className="inline-flex items-center gap-1 text-marca-700" href={`tel:${cliente.telefono}`}>
                    <Phone className="size-4" aria-hidden /> {cliente.telefono}
                  </a>
                </Dato>
              )}
              {cliente.email && (
                <Dato etiqueta="Correo">
                  <a className="inline-flex items-center gap-1 break-all text-marca-700" href={`mailto:${cliente.email}`}>
                    <Mail className="size-4" aria-hidden /> {cliente.email}
                  </a>
                </Dato>
              )}
              <Dato etiqueta="Dirección">
                <span className="inline-flex items-start gap-1">
                  <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {[cliente.direccion, cliente.distrito, cliente.ciudad, cliente.departamento].filter(Boolean).join(", ")}
                </span>
              </Dato>
              <Dato etiqueta="Zona">{cliente.zona?.nombre ?? "—"}</Dato>
              <Dato etiqueta="Primera compra">{formatFecha(cliente.primeraCompra)}</Dato>
              <Dato etiqueta="Última compra">{formatFecha(cliente.ultimaCompra)}</Dato>
            </dl>
            {cliente.notas && <p className="mt-3 whitespace-pre-line rounded-lg bg-fondo p-3 text-sm">{cliente.notas}</p>}
          </Card>

          <Card>
            <CardTitulo>Vendedor asignado</CardTitulo>
            <p className="mt-1">{cliente.vendedor?.nombre ?? "Sin asignar"}</p>
            {puedeReasignar && (
              <div className="mt-3 border-t border-borde pt-3">
                <FormularioReasignarCliente clienteId={cliente.id} vendedores={vendedores} actual={cliente.vendedorId} />
              </div>
            )}
            <h3 className="mt-4 text-sm font-semibold">Historial de asignación</h3>
            <ul className="mt-1 space-y-2 text-sm">
              {cliente.historialAsignacion.map((h) => (
                <li key={h.id} className="text-texto-suave">
                  {h.desdeVendedor?.nombre ?? "Sin asignar"} → <span className="text-texto">{h.haciaVendedor?.nombre ?? "Sin asignar"}</span>
                  <span className="block text-xs">
                    {formatFecha(h.createdAt)} · por {h.asignadoPor.nombre}{h.motivo ? ` · ${h.motivo}` : ""}
                  </span>
                </li>
              ))}
              {cliente.historialAsignacion.length === 0 && <li className="text-texto-suave">Sin movimientos.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
