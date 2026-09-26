import type { Metadata } from "next";
import Link from "next/link";
import { Download, Phone, Plus, Upload } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUsuario } from "@/server/sesion";
import { filtroClientes, vendedoresAsignables } from "@/server/clientes";
import { tienePermiso } from "@/lib/permisos";
import { NOMBRE_ESTADO, TONO_ESTADO, numeroWhatsApp, type EstadoCliente } from "@/lib/clientes";
import { formatFecha, formatSoles } from "@/lib/format";
import { Badge, Card, EncabezadoPagina } from "@/components/ui/card";
import { BotonLink, Paginacion, Vacio } from "@/components/ui/varios";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/campos";
import { Button } from "@/components/ui/button";
import { IconoWhatsApp } from "@/components/whatsapp";

export const metadata: Metadata = { title: "Clientes" };

const POR_PAGINA = 20;
type Filtros = { q?: string; estado?: string; categoria?: string; vendedor?: string; zona?: string; pagina?: string };

export default async function ClientesPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  const usuario = await requireUsuario();
  const f = await searchParams;
  const pagina = Math.max(1, Number(f.pagina) || 1);

  const where: Prisma.ClienteWhereInput = { AND: [await filtroClientes(usuario)] };
  const and = where.AND as Prisma.ClienteWhereInput[];
  if (f.q) {
    const q = f.q.trim();
    and.push({
      OR: [
        { razonSocial: { contains: q, mode: "insensitive" } },
        { nombreComercial: { contains: q, mode: "insensitive" } },
        { contactoNombre: { contains: q, mode: "insensitive" } },
        { ciudad: { contains: q, mode: "insensitive" } },
        { ruc: { startsWith: q.replace(/\D/g, "") || q } },
      ],
    });
  }
  if (f.estado && f.estado in NOMBRE_ESTADO) and.push({ estado: f.estado as EstadoCliente });
  if (f.categoria && ["A", "B", "C"].includes(f.categoria)) and.push({ categoria: f.categoria as "A" | "B" | "C" });
  if (f.vendedor) and.push(f.vendedor === "sin" ? { vendedorId: null } : { vendedorId: f.vendedor });
  if (f.zona) and.push({ zonaId: f.zona });

  const [clientes, total, vendedores, zonas] = await Promise.all([
    db.cliente.findMany({
      where,
      include: { vendedor: { select: { nombre: true } } },
      orderBy: [{ razonSocial: "asc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    db.cliente.count({ where }),
    usuario.rol === "VENDEDOR" ? [] : vendedoresAsignables(usuario),
    db.zona.findMany({ where: { activa: true }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
  ]);

  const params = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, ...extra })) if (v) p.set(k, v);
    return p.toString();
  };

  return (
    <>
      <EncabezadoPagina
        titulo="Clientes"
        descripcion={`${total} cliente${total === 1 ? "" : "s"}${usuario.rol === "VENDEDOR" ? " en tu cartera" : ""}`}
        acciones={
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/exportar/clientes?${params({ pagina: "" })}`}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-borde bg-superficie px-3 text-sm font-medium hover:bg-fondo"
            >
              <Download className="size-4" aria-hidden /> Excel
            </a>
            {tienePermiso(usuario.rol, "clientes.importar") && (
              <BotonLink href="/clientes/importar" variante="secundario">
                <Upload className="size-4" aria-hidden /> Importar
              </BotonLink>
            )}
            <BotonLink href="/clientes/nuevo">
              <Plus className="size-4" aria-hidden /> Nuevo
            </BotonLink>
          </div>
        }
      />

      <form className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-6">
        <Input name="q" defaultValue={f.q} placeholder="Buscar razón social, RUC, contacto, ciudad…" className="col-span-2" />
        <Select name="estado" defaultValue={f.estado ?? ""}>
          <option value="">Todos los estados</option>
          {Object.entries(NOMBRE_ESTADO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select name="categoria" defaultValue={f.categoria ?? ""}>
          <option value="">Todas las categorías</option>
          <option value="A">Categoría A</option>
          <option value="B">Categoría B</option>
          <option value="C">Categoría C</option>
        </Select>
        {usuario.rol !== "VENDEDOR" ? (
          <Select name="vendedor" defaultValue={f.vendedor ?? ""}>
            <option value="">Todos los vendedores</option>
            <option value="sin">Sin asignar</option>
            {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
          </Select>
        ) : (
          <Select name="zona" defaultValue={f.zona ?? ""}>
            <option value="">Todas las zonas</option>
            {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
          </Select>
        )}
        <Button type="submit" variante="secundario" className="col-span-2 lg:col-span-1">Filtrar</Button>
      </form>

      {clientes.length === 0 ? (
        <Vacio titulo="No hay clientes con esos filtros">Prueba con otra búsqueda o registra uno nuevo.</Vacio>
      ) : (
        <Card className="p-0 md:p-0">
          <ul className="divide-y divide-borde">
            {clientes.map((c) => {
              const wa = numeroWhatsApp(c.whatsapp ?? c.telefono);
              return (
                <li key={c.id} className="flex items-center gap-3 p-3 md:px-4">
                  <Link href={`/clientes/${c.id}`} className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{c.nombreComercial || c.razonSocial}</span>
                      <Badge tono={TONO_ESTADO[c.estado]}>{NOMBRE_ESTADO[c.estado]}</Badge>
                      <Badge>Cat. {c.categoria}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-texto-suave">
                      RUC {c.ruc} · {c.ciudad}
                      {usuario.rol !== "VENDEDOR" && ` · ${c.vendedor?.nombre ?? "Sin asignar"}`}
                    </p>
                    <p className="text-xs text-texto-suave">
                      Última compra: {formatFecha(c.ultimaCompra)} · Ticket prom.: {formatSoles(c.ticketPromedio)}
                    </p>
                  </Link>
                  <div className="flex shrink-0 gap-1">
                    {c.telefono && (
                      <a href={`tel:${c.telefono}`} aria-label={`Llamar a ${c.razonSocial}`} className="grid size-10 place-items-center rounded-full text-texto-suave hover:bg-fondo">
                        <Phone className="size-5" />
                      </a>
                    )}
                    {wa && (
                      <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener" aria-label={`WhatsApp a ${c.razonSocial}`} className="grid size-10 place-items-center rounded-full text-emerald-600 hover:bg-emerald-50">
                        <IconoWhatsApp className="size-5" />
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      <Paginacion pagina={pagina} paginas={Math.ceil(total / POR_PAGINA)} url={(p) => `/clientes?${params({ pagina: String(p) })}`} />
    </>
  );
}
