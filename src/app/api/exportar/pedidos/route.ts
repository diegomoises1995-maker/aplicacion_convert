import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUsuarioActual } from "@/server/sesion";
import { wherePedidos } from "@/server/pedidos";
import { respuestaExcel, num } from "@/server/excel";
import { NOMBRE_ESTADO_PEDIDO } from "@/lib/pedidos";

export async function GET(req: NextRequest) {
  const usuario = await getUsuarioActual();
  if (!usuario) return new Response("No autorizado", { status: 401 });
  const f = Object.fromEntries(req.nextUrl.searchParams.entries());
  const where = await wherePedidos(usuario, f);
  const pedidos = await db.pedido.findMany({
    where,
    include: {
      cliente: { select: { ruc: true, razonSocial: true, ciudad: true, zona: { select: { nombre: true } } } },
      vendedor: { select: { nombre: true } },
      items: { include: { modelo: { select: { sku: true, nombre: true } }, color: { select: { nombre: true } } } },
    },
    orderBy: { fecha: "desc" },
  });
  type P = (typeof pedidos)[number];
  const detalle = pedidos.flatMap((p) => p.items.map((i) => ({ p, i })));
  type D = (typeof detalle)[number];

  return respuestaExcel("pedidos", [
    {
      nombre: "Pedidos",
      filas: pedidos,
      columnas: [
        { titulo: "N°", valor: (p: P) => p.numero, formato: "numero" },
        { titulo: "Fecha", valor: (p: P) => p.fecha, formato: "fecha" },
        { titulo: "Estado", valor: (p: P) => NOMBRE_ESTADO_PEDIDO[p.estado], ancho: 18 },
        { titulo: "RUC", valor: (p: P) => p.cliente.ruc, ancho: 14 },
        { titulo: "Cliente", valor: (p: P) => p.cliente.razonSocial, ancho: 34 },
        { titulo: "Ciudad", valor: (p: P) => p.cliente.ciudad },
        { titulo: "Zona", valor: (p: P) => p.cliente.zona?.nombre },
        { titulo: "Vendedor", valor: (p: P) => p.vendedor.nombre, ancho: 20 },
        { titulo: "Series", valor: (p: P) => p.totalSeries, formato: "numero" },
        { titulo: "Pares", valor: (p: P) => p.totalPares, formato: "numero" },
        { titulo: "Valor venta", valor: (p: P) => num(p.baseImponible), formato: "soles" },
        { titulo: "IGV", valor: (p: P) => num(p.igv), formato: "soles" },
        { titulo: "Total", valor: (p: P) => num(p.total), formato: "soles" },
        { titulo: "Agencia", valor: (p: P) => p.agenciaEnvio },
        { titulo: "Guía", valor: (p: P) => p.numeroGuia },
        { titulo: "Comprobante", valor: (p: P) => p.comprobante },
        { titulo: "Cliente nuevo", valor: (p: P) => (p.esPrimerPedido ? "Sí" : "") },
      ],
    },
    {
      nombre: "Detalle",
      filas: detalle,
      columnas: [
        { titulo: "Pedido", valor: (d: D) => d.p.numero, formato: "numero" },
        { titulo: "Fecha", valor: (d: D) => d.p.fecha, formato: "fecha" },
        { titulo: "Cliente", valor: (d: D) => d.p.cliente.razonSocial, ancho: 30 },
        { titulo: "SKU", valor: (d: D) => d.i.modelo.sku },
        { titulo: "Modelo", valor: (d: D) => d.i.modelo.nombre, ancho: 24 },
        { titulo: "Color", valor: (d: D) => d.i.color.nombre },
        { titulo: "Series", valor: (d: D) => d.i.series, formato: "numero" },
        { titulo: "Pares", valor: (d: D) => d.i.pares, formato: "numero" },
        { titulo: "Precio par", valor: (d: D) => num(d.i.precioPar), formato: "soles" },
        { titulo: "Subtotal", valor: (d: D) => num(d.i.subtotal), formato: "soles" },
      ],
    },
  ]);
}
