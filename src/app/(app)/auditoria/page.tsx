import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermiso } from "@/server/sesion";
import { formatFecha } from "@/lib/format";
import { Badge, Card, EncabezadoPagina } from "@/components/ui/card";

export const metadata: Metadata = { title: "Auditoría" };

const POR_PAGINA = 50;

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; entidad?: string }>;
}) {
  await requirePermiso("auditoria.ver");
  const { pagina: paginaParam, entidad } = await searchParams;
  const pagina = Math.max(1, Number(paginaParam) || 1);
  const where = entidad ? { entidad } : {};

  const [registros, total, entidades] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { usuario: { select: { nombre: true } } },
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    db.auditLog.count({ where }),
    db.auditLog.findMany({ distinct: ["entidad"], select: { entidad: true }, orderBy: { entidad: "asc" } }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const url = (p: number, e = entidad) =>
    `/auditoria?${new URLSearchParams({ ...(e ? { entidad: e } : {}), pagina: String(p) })}`;

  return (
    <>
      <EncabezadoPagina
        titulo="Auditoría"
        descripcion="Cambios importantes: precios, descuentos, reasignaciones, usuarios."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/auditoria">
          <Badge tono={!entidad ? "marca" : "neutro"}>Todas</Badge>
        </Link>
        {entidades.map(({ entidad: e }) => (
          <Link key={e} href={url(1, e)}>
            <Badge tono={entidad === e ? "marca" : "neutro"}>{e}</Badge>
          </Link>
        ))}
      </div>

      <Card className="p-0 md:p-0">
        <ul className="divide-y divide-borde">
          {registros.map((r) => (
            <li key={r.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-sm font-medium">{r.accion}</span>
                <span className="text-xs text-texto-suave">{formatFecha(r.createdAt, true)}</span>
              </div>
              <p className="mt-1 text-sm text-texto-suave">
                {r.usuario?.nombre ?? "Sistema"} · {r.entidad}
                {r.entidadId ? ` · ${r.entidadId}` : ""}
                {r.ip ? ` · IP ${r.ip}` : ""}
              </p>
              {(r.antes || r.despues) && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-marca-700">Ver cambios</summary>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <pre className="overflow-x-auto rounded bg-fondo p-2">{JSON.stringify(r.antes, null, 2) ?? "—"}</pre>
                    <pre className="overflow-x-auto rounded bg-fondo p-2">{JSON.stringify(r.despues, null, 2) ?? "—"}</pre>
                  </div>
                </details>
              )}
            </li>
          ))}
          {registros.length === 0 && <li className="p-4 text-sm text-texto-suave">Sin registros.</li>}
        </ul>
      </Card>

      {paginas > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          {pagina > 1 ? <Link className="text-marca-700" href={url(pagina - 1)}>← Anterior</Link> : <span />}
          <span className="text-texto-suave">Página {pagina} de {paginas}</span>
          {pagina < paginas ? <Link className="text-marca-700" href={url(pagina + 1)}>Siguiente →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
