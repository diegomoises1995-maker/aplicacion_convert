import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ESTADOS_VENTA, redondear } from "@/lib/ventas";
import { ETAPAS, type Etapa } from "@/lib/pipeline";
import { sumarMeses, rangoMes } from "@/lib/fechas";
import type { Alcance } from "@/lib/alcance";

function filtroSql(alcance: Alcance, columna = Prisma.sql`p."vendedorId"`) {
  return alcance.tipo === "todos" ? Prisma.empty : Prisma.sql`AND ${columna} IN (${Prisma.join(alcance.ids)})`;
}
const ESTADOS_SQL = Prisma.sql`p."estado"::text IN (${Prisma.join([...ESTADOS_VENTA])})`;

/** Ventas (sin IGV) de los últimos 12 meses y de los mismos meses del año anterior. */
export async function ventasMensuales(alcance: Alcance, anio: number, mes: number) {
  const inicio = sumarMeses(anio, mes, -23);
  const desde = rangoMes(inicio.anio, inicio.mes).inicio;
  const hasta = rangoMes(anio, mes).fin;
  const filas = await db.$queryRaw<{ anio: number; mes: number; soles: Prisma.Decimal; pares: bigint }[]>`
    SELECT EXTRACT(YEAR FROM p."fecha" AT TIME ZONE 'America/Lima')::int AS anio,
           EXTRACT(MONTH FROM p."fecha" AT TIME ZONE 'America/Lima')::int AS mes,
           SUM(p."baseImponible") AS soles, SUM(p."totalPares") AS pares
    FROM "Pedido" p
    WHERE ${ESTADOS_SQL} AND p."fecha" >= ${desde} AND p."fecha" < ${hasta} ${filtroSql(alcance)}
    GROUP BY 1, 2`;
  const valor = (a: number, m: number) => Number(filas.find((f) => f.anio === a && f.mes === m)?.soles ?? 0);
  return Array.from({ length: 12 }, (_, i) => {
    const x = sumarMeses(anio, mes, i - 11);
    return { anio: x.anio, mes: x.mes, actual: redondear(valor(x.anio, x.mes)), anterior: redondear(valor(x.anio - 1, x.mes)) };
  });
}

export async function modelosMasVendidos(alcance: Alcance, desde: Date, hasta: Date, limite = 8) {
  const filas = await db.$queryRaw<{ id: string; sku: string; nombre: string; foto: string | null; pares: bigint; soles: Prisma.Decimal }[]>`
    SELECT m."id", m."sku", m."nombre", m."fotos"[1] AS foto, SUM(i."pares") AS pares, SUM(i."subtotal") AS soles
    FROM "ItemPedido" i
    JOIN "Pedido" p ON p."id" = i."pedidoId"
    JOIN "Modelo" m ON m."id" = i."modeloId"
    WHERE ${ESTADOS_SQL} AND p."fecha" >= ${desde} AND p."fecha" < ${hasta} ${filtroSql(alcance)}
    GROUP BY m."id" ORDER BY pares DESC LIMIT ${limite}`;
  return filas.map((f) => ({ ...f, pares: Number(f.pares), soles: Number(f.soles) }));
}

export async function ventasPorZona(alcance: Alcance, desde: Date, hasta: Date) {
  const filas = await db.$queryRaw<{ zona: string | null; soles: Prisma.Decimal; clientes: bigint }[]>`
    SELECT z."nombre" AS zona, SUM(p."baseImponible") AS soles, COUNT(DISTINCT p."clienteId") AS clientes
    FROM "Pedido" p
    JOIN "Cliente" c ON c."id" = p."clienteId"
    LEFT JOIN "Zona" z ON z."id" = c."zonaId"
    WHERE ${ESTADOS_SQL} AND p."fecha" >= ${desde} AND p."fecha" < ${hasta} ${filtroSql(alcance)}
    GROUP BY z."nombre" ORDER BY soles DESC`;
  return filas.map((f) => ({ zona: f.zona ?? "Sin zona", soles: Number(f.soles), clientes: Number(f.clientes) }));
}

/** Embudo: oportunidades abiertas + cerradas en los últimos 90 días, por etapa. */
export async function embudo(alcance: Alcance) {
  const hace90 = new Date(Date.now() - 90 * 86_400_000);
  const grupos = await db.oportunidad.groupBy({
    by: ["etapa"],
    where: {
      ...(alcance.tipo === "todos" ? {} : { vendedorId: { in: alcance.ids } }),
      OR: [{ fechaCierreReal: null }, { fechaCierreReal: { gte: hace90 } }],
    },
    _count: true,
    _sum: { valorEstimado: true },
  });
  return ETAPAS.map((etapa: Etapa) => {
    const g = grupos.find((x) => x.etapa === etapa);
    return { etapa, cantidad: g?._count ?? 0, valor: Number(g?._sum.valorEstimado ?? 0) };
  });
}
