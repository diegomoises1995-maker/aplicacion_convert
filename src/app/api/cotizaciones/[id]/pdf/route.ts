import { db } from "@/lib/db";
import { alcanceIncluye } from "@/lib/alcance";
import { getAlcance, getUsuarioActual } from "@/server/sesion";
import { getConfiguracion } from "@/server/configuracion";
import { generarPdfCotizacion } from "@/server/pdf/cotizacion";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await getUsuarioActual();
  if (!usuario) return new Response("No autorizado", { status: 401 });
  const { id } = await params;
  const c = await db.cotizacion.findUnique({
    where: { id },
    include: {
      cliente: true,
      vendedor: { select: { nombre: true, telefono: true, email: true } },
      items: { include: { modelo: { select: { nombre: true, sku: true } }, color: { select: { nombre: true } } } },
    },
  });
  if (!c || !alcanceIncluye(await getAlcance(usuario), c.vendedorId)) return new Response("No encontrada", { status: 404 });
  const config = await getConfiguracion();

  const minimo = config.pedidoMinimoCualquiera
    ? `${config.pedidoMinimoSeries} series o S/ ${config.pedidoMinimoMonto.toFixed(2)} sin IGV`
    : `${config.pedidoMinimoSeries} series y S/ ${config.pedidoMinimoMonto.toFixed(2)} sin IGV`;

  const pdf = await generarPdfCotizacion({
    numero: c.numero,
    fecha: c.createdAt,
    validaHasta: c.validaHasta,
    cliente: {
      razonSocial: c.cliente.razonSocial,
      ruc: c.cliente.ruc,
      contacto: c.cliente.contactoNombre,
      direccion: [c.cliente.direccion, c.cliente.distrito, c.cliente.ciudad].filter(Boolean).join(", "),
      telefono: c.cliente.telefono,
    },
    vendedor: c.vendedor,
    items: c.items.map((i) => ({
      modelo: i.modelo.nombre, sku: i.modelo.sku, color: i.color.nombre, series: i.series, pares: i.pares,
      precioPar: Number(i.precioPar), subtotal: Number(i.subtotal),
    })),
    subtotal: Number(c.subtotal),
    descuentoVolumen: Number(c.descuentoVolumen),
    descuentoPorcentaje: Number(c.descuentoPorcentaje),
    descuentoMonto: Number(c.descuentoMonto),
    baseImponible: Number(c.baseImponible),
    igvPorcentaje: config.igvPorcentaje,
    igv: Number(c.igv),
    total: Number(c.total),
    notas: c.notas,
    condiciones: [
      "Venta por series completas según la curva de tallas de cada modelo.",
      `Pedido mínimo: ${minimo}.`,
      "Pago adelantado por transferencia, depósito, Yape o Plin. El pedido se prepara al verificar el pago.",
      "Envío a provincias por la agencia de transporte que indique el cliente; flete por cuenta del cliente.",
      "Precios sujetos a disponibilidad de stock al momento de confirmar el pedido.",
    ],
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="cotizacion-${c.numero}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
