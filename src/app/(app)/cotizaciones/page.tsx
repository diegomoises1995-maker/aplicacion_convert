import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getAlcance, requireUsuario } from "@/server/sesion";
import { filtroVendedor } from "@/lib/alcance";
import { NOMBRE_ESTADO_COTIZACION, TONO_ESTADO_COTIZACION, estadoVisible, type EstadoCotizacion } from "@/lib/cotizaciones";
import { formatFecha, formatSoles } from "@/lib/format";
import { Badge, Card, EncabezadoPagina } from "@/components/ui/card";
import { BotonLink, Paginacion, Vacio } from "@/components/ui/varios";
import { Select } from "@/components/ui/campos";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Cotizaciones" };
const POR_PAGINA = 20;

export default async function CotizacionesPage({ searchParams }: { searchParams: Promise<{ estado?: string; pagina?: string }> }) {
  const usuario = await requireUsuario();
  const { estado, pagina: p } = await searchParams;
  const pagina = Math.max(1, Number(p) || 1);
  const where: Prisma.CotizacionWhereInput = {
    ...filtroVendedor(await getAlcance(usuario)),
    ...(estado && estado in NOMBRE_ESTADO_COTIZACION ? { estado: estado as EstadoCotizacion } : {}),
  };
  const [cotizaciones, total] = await Promise.all([
    db.cotizacion.findMany({
      where,
      include: { cliente: { select: { razonSocial: true, nombreComercial: true } }, vendedor: { select: { nombre: true } } },
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    db.cotizacion.count({ where }),
  ]);

  return (
    <>
      <EncabezadoPagina
        titulo="Cotizaciones"
        descripcion={`${total} cotizaciones`}
        acciones={<BotonLink href="/cotizaciones/nueva"><Plus className="size-4" aria-hidden /> Cotizar</BotonLink>}
      />
      <form className="mb-4 flex gap-2">
        <Select name="estado" defaultValue={estado ?? ""} className="max-w-xs">
          <option value="">Todos los estados</option>
          {Object.entries(NOMBRE_ESTADO_COTIZACION).filter(([k]) => k !== "VENCIDA").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Button type="submit" variante="secundario">Filtrar</Button>
      </form>
      {cotizaciones.length === 0 ? (
        <Vacio titulo="No hay cotizaciones">Crea una desde la ficha de un cliente o con «Cotizar».</Vacio>
      ) : (
        <Card className="p-0 md:p-0">
          <ul className="divide-y divide-borde">
            {cotizaciones.map((c) => {
              const ev = estadoVisible(c.estado, c.validaHasta);
              return (
                <li key={c.id}>
                  <Link href={`/cotizaciones/${c.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-fondo md:px-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">#{c.numero} · {c.cliente.nombreComercial || c.cliente.razonSocial}</p>
                      <p className="text-xs text-texto-suave">
                        {formatFecha(c.createdAt)}{usuario.rol !== "VENDEDOR" && ` · ${c.vendedor.nombre}`}
                        {Number(c.descuentoPorcentaje) > 0 && ` · desc. ${String(c.descuentoPorcentaje)} %`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold">{formatSoles(c.total)}</p>
                      <Badge tono={TONO_ESTADO_COTIZACION[ev]}>{NOMBRE_ESTADO_COTIZACION[ev]}</Badge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      <Paginacion pagina={pagina} paginas={Math.ceil(total / POR_PAGINA)} url={(n) => `/cotizaciones?${new URLSearchParams({ ...(estado ? { estado } : {}), pagina: String(n) })}`} />
    </>
  );
}
