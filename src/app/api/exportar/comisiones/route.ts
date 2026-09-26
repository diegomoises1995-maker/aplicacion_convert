import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAlcance, getUsuarioActual } from "@/server/sesion";
import { calcularComisionMes } from "@/server/indicadores";
import { filtroEquipo } from "@/lib/alcance";
import { etiquetaMes } from "@/lib/fechas";
import { respuestaExcel } from "@/server/excel";

export async function GET(req: NextRequest) {
  const usuario = await getUsuarioActual();
  if (!usuario) return new Response("No autorizado", { status: 401 });
  const anio = Number(req.nextUrl.searchParams.get("anio"));
  const mes = Number(req.nextUrl.searchParams.get("mes"));
  if (!anio || !(mes >= 1 && mes <= 12)) return new Response("Período inválido", { status: 400 });

  const vendedores = await db.user.findMany({
    where: { ...filtroEquipo(await getAlcance(usuario)), rol: { in: ["VENDEDOR", "SUPERVISOR"] } },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
  const filas = [];
  for (const v of vendedores) {
    const l = await db.liquidacionComision.findUnique({ where: { vendedorId_anio_mes: { vendedorId: v.id, anio, mes } } });
    const c = await calcularComisionMes(v.id, anio, mes);
    const lineas = l ? (l.detalle as { lineas: typeof c.lineas }).lineas : c.lineas;
    filas.push({
      vendedor: v.nombre,
      estado: l?.estado ?? "PROYECCIÓN",
      ventaCobrada: l ? Number(l.ventaCobrada) : c.resultados.ventaCobrada,
      cumplimiento: c.resultados.cumplimientoSoles,
      nuevos: c.resultados.clientesNuevos,
      comisionVenta: l ? Number(l.comisionVenta) : c.comisionVenta,
      bonos: l ? Number(l.bonos) : c.bonos,
      total: l ? Number(l.total) : c.total,
      detalle: lineas.map((x) => `${x.regla}: S/ ${x.monto.toFixed(2)}`).join(" | "),
    });
  }
  type F = (typeof filas)[number];
  return respuestaExcel(`comisiones-${anio}-${String(mes).padStart(2, "0")}`, [
    {
      nombre: etiquetaMes(anio, mes),
      filas: filas.filter((f) => f.total > 0 || f.estado !== "PROYECCIÓN"),
      columnas: [
        { titulo: "Vendedor", valor: (f: F) => f.vendedor, ancho: 24 },
        { titulo: "Estado", valor: (f: F) => f.estado },
        { titulo: "Venta cobrada (sin IGV)", valor: (f: F) => f.ventaCobrada, formato: "soles", ancho: 22 },
        { titulo: "Cumplimiento meta", valor: (f: F) => f.cumplimiento, formato: "porcentaje", ancho: 18 },
        { titulo: "Clientes nuevos", valor: (f: F) => f.nuevos, formato: "numero" },
        { titulo: "Comisión venta", valor: (f: F) => f.comisionVenta, formato: "soles" },
        { titulo: "Bonos", valor: (f: F) => f.bonos, formato: "soles" },
        { titulo: "Total", valor: (f: F) => f.total, formato: "soles" },
        { titulo: "Detalle", valor: (f: F) => f.detalle, ancho: 60 },
      ],
    },
  ]);
}
