import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getAlcance, requireUsuario } from "@/server/sesion";
import { alcanceIncluye } from "@/lib/alcance";
import { tienePermiso } from "@/lib/permisos";
import { AGENCIAS_ENVIO, NOMBRE_ESTADO_PEDIDO, TONO_ESTADO_PEDIDO, transicionesPosibles } from "@/lib/pedidos";
import { formatFecha, formatSoles } from "@/lib/format";
import { redondear } from "@/lib/ventas";
import { Badge, Card, CardTitulo, EncabezadoPagina } from "@/components/ui/card";
import { Aviso, Dato } from "@/components/ui/varios";
import { FotoModelo } from "@/components/foto-modelo";
import { BotonVerificarPago, FormularioEstado, FormularioPago } from "./acciones";

export const metadata: Metadata = { title: "Pedido" };

const METODO = { TRANSFERENCIA: "Transferencia", DEPOSITO: "Depósito", YAPE: "Yape", PLIN: "Plin", EFECTIVO: "Efectivo", OTRO: "Otro" } as const;

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await requireUsuario();
  const p = await db.pedido.findUnique({
    where: { id },
    include: {
      cliente: true,
      vendedor: { select: { nombre: true } },
      cotizacion: { select: { id: true, numero: true } },
      items: { include: { modelo: { select: { nombre: true, sku: true, fotos: true } }, color: { select: { nombre: true } } } },
      pagos: { include: { verificadoPor: { select: { nombre: true } } }, orderBy: { fecha: "asc" } },
      historial: { include: { usuario: { select: { nombre: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!p || !alcanceIncluye(await getAlcance(usuario), p.vendedorId)) notFound();

  const pagadoVerificado = p.pagos.filter((x) => x.verificado).reduce((s, x) => s + Number(x.monto), 0);
  const pagadoTotal = p.pagos.reduce((s, x) => s + Number(x.monto), 0);
  const saldo = redondear(Number(p.total) - pagadoVerificado);
  const verificaPagos = tienePermiso(usuario.rol, "pagos.verificar");
  const gestiona = tienePermiso(usuario.rol, "pedidos.gestionar");
  const transiciones = transicionesPosibles(p.estado).filter((e) => {
    if (e === "PAGO_VERIFICADO") return verificaPagos;
    if (e === "CANCELADO") return p.estado === "PENDIENTE_PAGO" || gestiona;
    return gestiona;
  });

  return (
    <>
      <EncabezadoPagina
        titulo={`Pedido #${p.numero}`}
        descripcion={`${p.cliente.nombreComercial || p.cliente.razonSocial} · ${formatFecha(p.fecha)} · ${p.vendedor.nombre}`}
        acciones={<Badge tono={TONO_ESTADO_PEDIDO[p.estado]}>{NOMBRE_ESTADO_PEDIDO[p.estado]}</Badge>}
      />
      {p.estado === "CANCELADO" && p.motivoCancelacion && <div className="mb-4"><Aviso tono="error">Cancelado: {p.motivoCancelacion}</Aviso></div>}
      {(p.esPrimerPedido || p.esReactivacion) && (
        <div className="mb-4 flex gap-2">
          {p.esPrimerPedido && <Badge tono="verde">Primer pedido del cliente</Badge>}
          {p.esReactivacion && <Badge tono="marca">Cliente reactivado</Badge>}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-0 md:p-0">
            <ul className="divide-y divide-borde">
              {p.items.map((i) => (
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
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatSoles(p.subtotal)}</dd></div>
              {Number(p.descuentoMonto) > 0 && <div className="flex justify-between text-emerald-700"><dt>Descuentos</dt><dd>−{formatSoles(p.descuentoMonto)}</dd></div>}
              <div className="flex justify-between"><dt>Valor de venta</dt><dd>{formatSoles(p.baseImponible)}</dd></div>
              <div className="flex justify-between"><dt>IGV</dt><dd>{formatSoles(p.igv)}</dd></div>
              <div className="flex justify-between text-lg font-semibold"><dt>Total</dt><dd>{formatSoles(p.total)}</dd></div>
            </dl>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitulo>Pagos</CardTitulo>
              <p className="text-sm">
                Verificado {formatSoles(pagadoVerificado)} de {formatSoles(p.total)}
                {saldo > 0.01 && <span className="text-amber-700"> · saldo {formatSoles(saldo)}</span>}
              </p>
            </div>
            <ul className="mt-2 divide-y divide-borde text-sm">
              {p.pagos.map((x) => (
                <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <strong>{formatSoles(x.monto)}</strong> · {METODO[x.metodo]} · {formatFecha(x.fecha)}{x.referencia ? ` · Ref. ${x.referencia}` : ""}
                  </span>
                  {x.verificado ? (
                    <Badge tono="verde">Verificado{x.verificadoPor ? ` por ${x.verificadoPor.nombre}` : ""}</Badge>
                  ) : verificaPagos ? (
                    <BotonVerificarPago pagoId={x.id} />
                  ) : (
                    <Badge tono="amarillo">Por verificar</Badge>
                  )}
                </li>
              ))}
              {p.pagos.length === 0 && <li className="py-2 text-texto-suave">Sin pagos registrados.</li>}
            </ul>
            {p.estado !== "CANCELADO" && pagadoTotal < Number(p.total) && (
              <details className="mt-3 border-t border-borde pt-3" open={p.pagos.length === 0}>
                <summary className="cursor-pointer text-sm font-medium text-marca-700">Registrar pago</summary>
                <div className="mt-3"><FormularioPago pedidoId={p.id} saldo={redondear(Number(p.total) - pagadoTotal)} /></div>
              </details>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          {transiciones.length > 0 && (
            <Card>
              <CardTitulo className="mb-3">Siguiente paso</CardTitulo>
              <FormularioEstado pedidoId={p.id} transiciones={transiciones} agencias={AGENCIAS_ENVIO} agencia={p.agenciaEnvio} saldo={saldo} />
            </Card>
          )}
          <Card>
            <dl className="space-y-2">
              <Dato etiqueta="Cliente"><Link className="text-marca-700" href={`/clientes/${p.clienteId}`}>{p.cliente.razonSocial}</Link></Dato>
              <Dato etiqueta="RUC">{p.cliente.ruc}</Dato>
              {p.cotizacion && <Dato etiqueta="Cotización"><Link className="text-marca-700" href={`/cotizaciones/${p.cotizacion.id}`}>#{p.cotizacion.numero}</Link></Dato>}
              <Dato etiqueta="Dirección de envío">{p.direccionEnvio ?? "—"}</Dato>
              <Dato etiqueta="Agencia">{p.agenciaEnvio ?? "Por definir"}</Dato>
              {p.numeroGuia && <Dato etiqueta="N° de guía"><span className="font-mono">{p.numeroGuia}</span></Dato>}
              {p.comprobante && <Dato etiqueta="Comprobante">{p.comprobante}</Dato>}
              <Dato etiqueta="Series / pares">{p.totalSeries} / {p.totalPares}</Dato>
              {p.notas && <Dato etiqueta="Notas">{p.notas}</Dato>}
            </dl>
          </Card>
          <Card>
            <CardTitulo>Seguimiento</CardTitulo>
            <ol className="mt-3 space-y-3 border-l-2 border-marca-100 pl-4 text-sm">
              {p.historial.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[1.4rem] top-1 size-2.5 rounded-full bg-marca-500" />
                  <p className="font-medium">{NOMBRE_ESTADO_PEDIDO[h.estadoNuevo]}</p>
                  <p className="text-xs text-texto-suave">{formatFecha(h.createdAt, true)} · {h.usuario.nombre}</p>
                  {h.comentario && <p className="text-xs">{h.comentario}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
