import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getUsuarioActual } from "@/server/sesion";
import { filtroClientes } from "@/server/clientes";
import { respuestaExcel, num } from "@/server/excel";
import { NOMBRE_ESTADO, NOMBRE_TIPO_CLIENTE, type EstadoCliente } from "@/lib/clientes";

export async function GET(req: NextRequest) {
  const usuario = await getUsuarioActual();
  if (!usuario) return new Response("No autorizado", { status: 401 });
  const sp = req.nextUrl.searchParams;

  const and: Prisma.ClienteWhereInput[] = [await filtroClientes(usuario)];
  const q = sp.get("q");
  if (q) and.push({ OR: [{ razonSocial: { contains: q, mode: "insensitive" } }, { ruc: { startsWith: q } }, { ciudad: { contains: q, mode: "insensitive" } }] });
  const estado = sp.get("estado");
  if (estado && estado in NOMBRE_ESTADO) and.push({ estado: estado as EstadoCliente });
  const categoria = sp.get("categoria");
  if (categoria && ["A", "B", "C"].includes(categoria)) and.push({ categoria: categoria as "A" | "B" | "C" });
  const vendedor = sp.get("vendedor");
  if (vendedor) and.push({ vendedorId: vendedor === "sin" ? null : vendedor });

  const clientes = await db.cliente.findMany({
    where: { AND: and },
    include: { vendedor: { select: { nombre: true } }, zona: { select: { nombre: true } } },
    orderBy: { razonSocial: "asc" },
  });
  type C = (typeof clientes)[number];

  return respuestaExcel("clientes", [
    {
      nombre: "Clientes",
      filas: clientes,
      columnas: [
        { titulo: "RUC", valor: (c: C) => c.ruc, ancho: 14 },
        { titulo: "Razón social", valor: (c: C) => c.razonSocial, ancho: 36 },
        { titulo: "Nombre comercial", valor: (c: C) => c.nombreComercial, ancho: 24 },
        { titulo: "Tipo", valor: (c: C) => NOMBRE_TIPO_CLIENTE[c.tipo] },
        { titulo: "Categoría", valor: (c: C) => c.categoria },
        { titulo: "Estado", valor: (c: C) => NOMBRE_ESTADO[c.estado] },
        { titulo: "Contacto", valor: (c: C) => c.contactoNombre, ancho: 20 },
        { titulo: "Teléfono", valor: (c: C) => c.telefono },
        { titulo: "WhatsApp", valor: (c: C) => c.whatsapp },
        { titulo: "Correo", valor: (c: C) => c.email, ancho: 26 },
        { titulo: "Ciudad", valor: (c: C) => c.ciudad },
        { titulo: "Departamento", valor: (c: C) => c.departamento },
        { titulo: "Zona", valor: (c: C) => c.zona?.nombre },
        { titulo: "Vendedor", valor: (c: C) => c.vendedor?.nombre, ancho: 20 },
        { titulo: "Primera compra", valor: (c: C) => c.primeraCompra, formato: "fecha" },
        { titulo: "Última compra", valor: (c: C) => c.ultimaCompra, formato: "fecha" },
        { titulo: "Frecuencia (días)", valor: (c: C) => c.frecuenciaDias, formato: "numero" },
        { titulo: "N° pedidos", valor: (c: C) => c.numeroPedidos, formato: "numero" },
        { titulo: "Ticket promedio", valor: (c: C) => num(c.ticketPromedio), formato: "soles" },
        { titulo: "Compras 12m (sin IGV)", valor: (c: C) => num(c.totalComprado12m), formato: "soles" },
      ],
    },
  ]);
}
