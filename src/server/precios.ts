import "server-only";
import type { TipoCliente } from "@prisma/client";
import { db } from "@/lib/db";
import { paresPorSerie, seriesDisponibles, type Distribucion } from "@/lib/stock";

/** Lista de precios aplicable: la asignada al cliente o la de su tipo de cliente. */
export async function contextoPrecios(cliente: { listaPrecioId: string | null; tipo: TipoCliente }) {
  const lista =
    (cliente.listaPrecioId
      ? await db.listaPrecio.findFirst({ where: { id: cliente.listaPrecioId, activa: true } })
      : null) ?? (await db.listaPrecio.findFirst({ where: { tipoCliente: cliente.tipo, activa: true } }));

  const [escalasLista, escalasGenerales, precios] = await Promise.all([
    lista ? db.escalaPrecio.findMany({ where: { listaId: lista.id } }) : [],
    db.escalaPrecio.findMany({ where: { listaId: null } }),
    lista ? db.precioLista.findMany({ where: { listaId: lista.id } }) : [],
  ]);
  const escalas = (escalasLista.length ? escalasLista : escalasGenerales)
    .map((e) => ({ desdeSeries: e.desdeSeries, descuentoPorcentaje: Number(e.descuentoPorcentaje) }))
    .sort((a, b) => a.desdeSeries - b.desdeSeries);

  return {
    lista: lista ? { id: lista.id, nombre: lista.nombre, ajuste: Number(lista.ajustePorcentaje) } : null,
    escalas,
    preciosPorModelo: Object.fromEntries(precios.map((p) => [p.modeloId, Number(p.precio)])) as Record<string, number>,
  };
}

export type ContextoPrecios = Awaited<ReturnType<typeof contextoPrecios>>;

/** Modelos activos con curva, colores y stock, listos para el cotizador. */
export async function catalogoParaCotizar() {
  const modelos = await db.modelo.findMany({
    where: { activo: true },
    include: { curva: true, variantes: { include: { color: true } } },
    orderBy: { nombre: "asc" },
  });
  return modelos.map((m) => {
    const distribucion = m.curva.distribucion as Distribucion;
    const porColor = new Map<string, { id: string; nombre: string; hex: string | null; stock: Record<string, number> }>();
    for (const v of m.variantes) {
      const c = porColor.get(v.colorId) ?? { id: v.colorId, nombre: v.color.nombre, hex: v.color.hex, stock: {} };
      c.stock[String(v.talla)] = v.stock;
      porColor.set(v.colorId, c);
    }
    return {
      id: m.id,
      sku: m.sku,
      nombre: m.nombre,
      foto: m.fotos[0] ?? null,
      precioBase: Number(m.precioBase),
      curva: m.curva.nombre,
      distribucion,
      paresPorSerie: paresPorSerie(distribucion),
      colores: [...porColor.values()].map((c) => ({ id: c.id, nombre: c.nombre, hex: c.hex, series: seriesDisponibles(distribucion, c.stock) })),
    };
  });
}

export type ModeloCotizable = Awaited<ReturnType<typeof catalogoParaCotizar>>[number];
