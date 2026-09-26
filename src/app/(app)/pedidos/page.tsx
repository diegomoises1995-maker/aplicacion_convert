import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { db } from "@/lib/db";
import { requireUsuario } from "@/server/sesion";
import { vendedoresAsignables } from "@/server/clientes";
import { wherePedidos, type FiltrosPedidos } from "@/server/pedidos";
import { NOMBRE_ESTADO_PEDIDO, TONO_ESTADO_PEDIDO } from "@/lib/pedidos";
import { formatFecha, formatSoles } from "@/lib/format";
import { Badge, Card, EncabezadoPagina } from "@/components/ui/card";
import { Paginacion, Vacio } from "@/components/ui/varios";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/campos";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Pedidos" };
const POR_PAGINA = 20;

export default async function PedidosPage({ searchParams }: { searchParams: Promise<FiltrosPedidos & { pagina?: string }> }) {
  const usuario = await requireUsuario();
  const f = await searchParams;
  const pagina = Math.max(1, Number(f.pagina) || 1);
  const where = await wherePedidos(usuario, f);
  const [pedidos, total, suma, vendedores] = await Promise.all([
    db.pedido.findMany({
      where,
      include: { cliente: { select: { razonSocial: true, nombreComercial: true, ciudad: true } }, vendedor: { select: { nombre: true } } },
      orderBy: { fecha: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    db.pedido.count({ where }),
    db.pedido.aggregate({ where, _sum: { total: true, totalPares: true } }),
    usuario.rol === "VENDEDOR" ? [] : vendedoresAsignables(usuario),
  ]);
  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, ...extra })) if (v) p.set(k, v);
    return p.toString();
  };

  return (
    <>
      <EncabezadoPagina
        titulo="Pedidos"
        descripcion={`${total} pedidos · ${formatSoles(suma._sum.total ?? 0)} · ${suma._sum.totalPares ?? 0} pares`}
        acciones={
          <a href={`/api/exportar/pedidos?${qs({ pagina: "" })}`} className="inline-flex h-11 items-center gap-2 rounded-lg border border-borde bg-superficie px-3 text-sm font-medium hover:bg-fondo">
            <Download className="size-4" aria-hidden /> Excel
          </a>
        }
      />
      <form className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-6">
        <Input name="q" defaultValue={f.q} placeholder="N°, cliente o guía…" className="col-span-2" />
        <Select name="estado" defaultValue={f.estado ?? ""}>
          <option value="">Todos los estados</option>
          {Object.entries(NOMBRE_ESTADO_PEDIDO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        {vendedores.length > 0 ? (
          <Select name="vendedor" defaultValue={f.vendedor ?? ""}>
            <option value="">Todos los vendedores</option>
            {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
          </Select>
        ) : <span className="hidden lg:block" />}
        <Input name="desde" type="date" defaultValue={f.desde} aria-label="Desde" />
        <Input name="hasta" type="date" defaultValue={f.hasta} aria-label="Hasta" />
        {f.cliente && <input type="hidden" name="cliente" value={f.cliente} />}
        <Button type="submit" variante="secundario" className="col-span-2 lg:col-span-1">Filtrar</Button>
      </form>

      {pedidos.length === 0 ? (
        <Vacio titulo="No hay pedidos con esos filtros">Los pedidos se crean al convertir una cotización.</Vacio>
      ) : (
        <Card className="p-0 md:p-0">
          <ul className="divide-y divide-borde">
            {pedidos.map((p) => (
              <li key={p.id}>
                <Link href={`/pedidos/${p.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-fondo md:px-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">#{p.numero} · {p.cliente.nombreComercial || p.cliente.razonSocial}</p>
                    <p className="text-xs text-texto-suave">
                      {formatFecha(p.fecha)} · {p.cliente.ciudad} · {p.totalSeries} series{usuario.rol !== "VENDEDOR" && ` · ${p.vendedor.nombre}`}
                      {p.numeroGuia && ` · Guía ${p.numeroGuia}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold">{formatSoles(p.total)}</p>
                    <Badge tono={TONO_ESTADO_PEDIDO[p.estado]}>{NOMBRE_ESTADO_PEDIDO[p.estado]}</Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Paginacion pagina={pagina} paginas={Math.ceil(total / POR_PAGINA)} url={(n) => `/pedidos?${qs({ pagina: String(n) })}`} />
    </>
  );
}
