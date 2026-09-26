import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ESTADOS_VENTA } from "@/lib/ventas";
import type { Alcance } from "@/lib/alcance";
import { desdeInputFecha, partesLima, aInputFecha, rangoMes } from "@/lib/fechas";

export type Rango = { desde: Date; hasta: Date; desdeTexto: string; hastaTexto: string };

/** Rango [desde, hasta] inclusivo en días de Lima; por defecto, el mes en curso. */
export function leerRango(sp: { desde?: string; hasta?: string }): Rango {
  const { anio, mes } = partesLima();
  const mesActual = rangoMes(anio, mes);
  const d = sp.desde ? desdeInputFecha(sp.desde) : null;
  const h = sp.hasta ? desdeInputFecha(sp.hasta) : null;
  const desde = d ? new Date(d.getTime() - 12 * 3_600_000) : mesActual.inicio;
  const hasta = h ? new Date(h.getTime() + 12 * 3_600_000) : mesActual.fin;
  return { desde, hasta, desdeTexto: aInputFecha(desde), hastaTexto: aInputFecha(new Date(hasta.getTime() - 1)) };
}

const ESTADOS = Prisma.sql`p."estado"::text IN (${Prisma.join([...ESTADOS_VENTA])})`;
const alcanceSql = (a: Alcance, col = Prisma.sql`p."vendedorId"`) =>
  a.tipo === "todos" ? Prisma.empty : Prisma.sql`AND ${col} IN (${Prisma.join(a.ids)})`;

export async function reporteVendedores(a: Alcance, r: Rango) {
  const filas = await db.$queryRaw<{ id: string; nombre: string; pedidos: bigint; soles: Prisma.Decimal | null; pares: bigint | null; nuevos: bigint; clientes: bigint }[]>`
    SELECT u."id", u."nombre", COUNT(p."id") AS pedidos, SUM(p."baseImponible") AS soles, SUM(p."totalPares") AS pares,
           COUNT(p."id") FILTER (WHERE p."esPrimerPedido") AS nuevos, COUNT(DISTINCT p."clienteId") AS clientes
    FROM "User" u
    LEFT JOIN "Pedido" p ON p."vendedorId" = u."id" AND ${ESTADOS} AND p."fecha" >= ${r.desde} AND p."fecha" < ${r.hasta}
    WHERE u."rol"::text IN ('VENDEDOR', 'SUPERVISOR') ${alcanceSql(a, Prisma.sql`u."id"`)}
    GROUP BY u."id" HAVING COUNT(p."id") > 0 OR bool_or(u."activo")
    ORDER BY soles DESC NULLS LAST`;
  return filas.map((f) => {
    const soles = Number(f.soles ?? 0);
    const pedidos = Number(f.pedidos);
    return { vendedor: f.nombre, pedidos, soles, pares: Number(f.pares ?? 0), nuevos: Number(f.nuevos), clientes: Number(f.clientes), ticket: pedidos ? soles / pedidos : 0 };
  });
}

export async function reporteClientes(a: Alcance, r: Rango) {
  const filas = await db.$queryRaw<{ ruc: string; razon: string; ciudad: string; vendedor: string | null; categoria: string; estado: string; pedidos: bigint; soles: Prisma.Decimal; pares: bigint }[]>`
    SELECT c."ruc", c."razonSocial" AS razon, c."ciudad", u."nombre" AS vendedor, c."categoria"::text, c."estado"::text,
           COUNT(p."id") AS pedidos, SUM(p."baseImponible") AS soles, SUM(p."totalPares") AS pares
    FROM "Pedido" p JOIN "Cliente" c ON c."id" = p."clienteId" LEFT JOIN "User" u ON u."id" = c."vendedorId"
    WHERE ${ESTADOS} AND p."fecha" >= ${r.desde} AND p."fecha" < ${r.hasta} ${alcanceSql(a)}
    GROUP BY c."id", u."nombre" ORDER BY soles DESC`;
  return filas.map((f) => ({ ...f, pedidos: Number(f.pedidos), soles: Number(f.soles), pares: Number(f.pares) }));
}

export async function reporteModelos(a: Alcance, r: Rango) {
  const filas = await db.$queryRaw<{ sku: string; nombre: string; color: string; series: bigint; pares: bigint; soles: Prisma.Decimal; clientes: bigint }[]>`
    SELECT m."sku", m."nombre", co."nombre" AS color, SUM(i."series") AS series, SUM(i."pares") AS pares, SUM(i."subtotal") AS soles,
           COUNT(DISTINCT p."clienteId") AS clientes
    FROM "ItemPedido" i JOIN "Pedido" p ON p."id" = i."pedidoId" JOIN "Modelo" m ON m."id" = i."modeloId" JOIN "Color" co ON co."id" = i."colorId"
    WHERE ${ESTADOS} AND p."fecha" >= ${r.desde} AND p."fecha" < ${r.hasta} ${alcanceSql(a)}
    GROUP BY m."id", co."id" ORDER BY pares DESC`;
  return filas.map((f) => ({ ...f, series: Number(f.series), pares: Number(f.pares), soles: Number(f.soles), clientes: Number(f.clientes) }));
}

export async function reporteZonas(a: Alcance, r: Rango) {
  const filas = await db.$queryRaw<{ zona: string | null; pedidos: bigint; soles: Prisma.Decimal; clientes: bigint }[]>`
    SELECT z."nombre" AS zona, COUNT(p."id") AS pedidos, SUM(p."baseImponible") AS soles, COUNT(DISTINCT p."clienteId") AS clientes
    FROM "Pedido" p JOIN "Cliente" c ON c."id" = p."clienteId" LEFT JOIN "Zona" z ON z."id" = c."zonaId"
    WHERE ${ESTADOS} AND p."fecha" >= ${r.desde} AND p."fecha" < ${r.hasta} ${alcanceSql(a)}
    GROUP BY z."nombre" ORDER BY soles DESC`;
  return filas.map((f) => ({ zona: f.zona ?? "Sin zona", pedidos: Number(f.pedidos), soles: Number(f.soles), clientes: Number(f.clientes) }));
}

export async function reporteActividades(a: Alcance, r: Rango) {
  const filas = await db.$queryRaw<{ vendedor: string; tipo: string; total: bigint; exitosas: bigint; pendientes: bigint }[]>`
    SELECT u."nombre" AS vendedor, act."tipo"::text AS tipo, COUNT(*) AS total,
           COUNT(*) FILTER (WHERE act."resultado" = 'EXITOSA') AS exitosas,
           COUNT(*) FILTER (WHERE NOT act."completada") AS pendientes
    FROM "Actividad" act JOIN "User" u ON u."id" = act."vendedorId"
    WHERE act."fechaProgramada" >= ${r.desde} AND act."fechaProgramada" < ${r.hasta} ${alcanceSql(a, Prisma.sql`act."vendedorId"`)}
    GROUP BY u."nombre", act."tipo" ORDER BY u."nombre", total DESC`;
  return filas.map((f) => ({ ...f, total: Number(f.total), exitosas: Number(f.exitosas), pendientes: Number(f.pendientes) }));
}

export async function reporteOportunidades(a: Alcance, r: Rango) {
  return db.oportunidad.findMany({
    where: {
      ...(a.tipo === "todos" ? {} : { vendedorId: { in: a.ids } }),
      OR: [{ fechaCierreReal: null }, { fechaCierreReal: { gte: r.desde, lt: r.hasta } }],
    },
    include: { cliente: { select: { razonSocial: true } }, vendedor: { select: { nombre: true } } },
    orderBy: [{ etapa: "asc" }, { valorEstimado: "desc" }],
  });
}

export async function motivosPerdida(a: Alcance, r: Rango) {
  const g = await db.oportunidad.groupBy({
    by: ["motivoPerdida"],
    where: { etapa: "PERDIDO", fechaCierreReal: { gte: r.desde, lt: r.hasta }, ...(a.tipo === "todos" ? {} : { vendedorId: { in: a.ids } }) },
    _count: true,
    _sum: { valorEstimado: true },
    orderBy: { _count: { motivoPerdida: "desc" } },
  });
  return g.map((x) => ({ motivo: x.motivoPerdida ?? "Sin motivo", cantidad: x._count, valor: Number(x._sum.valorEstimado ?? 0) }));
}
