import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUsuario } from "@/server/sesion";
import { tienePermiso } from "@/lib/permisos";
import { NOMBRE_GENERO } from "@/lib/catalogo";
import { seriesDisponibles, type Distribucion } from "@/lib/stock";
import { formatNumero, formatSoles } from "@/lib/format";
import { Badge, Card, EncabezadoPagina } from "@/components/ui/card";
import { BotonLink, Vacio } from "@/components/ui/varios";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/campos";
import { Button } from "@/components/ui/button";
import { FotoModelo } from "@/components/foto-modelo";

export const metadata: Metadata = { title: "Catálogo" };

export default async function CatalogoPage({ searchParams }: { searchParams: Promise<{ q?: string; genero?: string; inactivos?: string }> }) {
  const usuario = await requireUsuario();
  const { q, genero, inactivos } = await searchParams;
  const gestiona = tienePermiso(usuario.rol, "catalogo.gestionar");

  const where: Prisma.ModeloWhereInput = {
    ...(gestiona && inactivos ? {} : { activo: true }),
    ...(genero && genero in NOMBRE_GENERO ? { genero: genero as keyof typeof NOMBRE_GENERO } : {}),
    ...(q ? { OR: [{ nombre: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const modelos = await db.modelo.findMany({
    where,
    include: { curva: true, variantes: { include: { color: true } } },
    orderBy: { nombre: "asc" },
  });

  return (
    <>
      <EncabezadoPagina
        titulo="Catálogo"
        descripcion={`${modelos.length} modelos · precios por par sin IGV`}
        acciones={gestiona && <BotonLink href="/catalogo/nuevo"><Plus className="size-4" aria-hidden /> Modelo</BotonLink>}
      />
      <form className="mb-4 grid grid-cols-2 gap-2 md:flex">
        <Input name="q" defaultValue={q} placeholder="Buscar modelo o SKU…" className="col-span-2 md:max-w-xs" />
        <Select name="genero" defaultValue={genero ?? ""} className="md:max-w-44">
          <option value="">Todos</option>
          {Object.entries(NOMBRE_GENERO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        {gestiona && (
          <Select name="inactivos" defaultValue={inactivos ?? ""} className="md:max-w-44">
            <option value="">Solo activos</option>
            <option value="1">Incluir inactivos</option>
          </Select>
        )}
        <Button type="submit" variante="secundario" className={gestiona ? "col-span-2 md:col-span-1" : ""}>Filtrar</Button>
      </form>

      {modelos.length === 0 ? (
        <Vacio titulo="No hay modelos">{gestiona ? "Crea el primero con «Modelo»." : "Aún no se cargó el catálogo."}</Vacio>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {modelos.map((m) => {
            const d = m.curva.distribucion as Distribucion;
            const colores = new Map<string, { nombre: string; hex: string | null; stock: Record<string, number> }>();
            for (const v of m.variantes) {
              const c = colores.get(v.colorId) ?? { nombre: v.color.nombre, hex: v.color.hex, stock: {} };
              c.stock[String(v.talla)] = v.stock;
              colores.set(v.colorId, c);
            }
            const series = [...colores.values()].reduce((s, c) => s + seriesDisponibles(d, c.stock), 0);
            const pares = m.variantes.reduce((s, v) => s + v.stock, 0);
            return (
              <li key={m.id}>
                <Link href={`/catalogo/${m.id}`} className="block h-full">
                  <Card className="h-full overflow-hidden p-0 hover:border-marca-200 md:p-0">
                    <FotoModelo src={m.fotos[0]} alt={m.nombre} className="aspect-[4/3] w-full" />
                    <div className="p-3">
                      <p className="text-xs text-texto-suave">{m.sku} · {NOMBRE_GENERO[m.genero]}</p>
                      <p className="font-medium leading-tight">{m.nombre}</p>
                      <p className="mt-1 font-semibold text-marca-700">{formatSoles(m.precioBase)} <span className="text-xs font-normal text-texto-suave">/ par</span></p>
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {[...colores.values()].map((c) => (
                          <span key={c.nombre} title={c.nombre} className="size-4 rounded-full border border-borde" style={{ background: c.hex ?? "#ccc" }} />
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-texto-suave">
                        {series > 0 ? `${series} series · ${formatNumero(pares)} pares` : <Badge tono="rojo">Sin stock</Badge>}
                        {!m.activo && <Badge tono="neutro" className="ml-1">Inactivo</Badge>}
                      </p>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
