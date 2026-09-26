import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUsuario } from "@/server/sesion";
import { NOMBRE_ROL } from "@/lib/permisos";
import { Badge, Card, CardTitulo, EncabezadoPagina } from "@/components/ui/card";

export const metadata: Metadata = { title: "Inicio" };

export default async function InicioPage({
  searchParams,
}: {
  searchParams: Promise<{ acceso?: string }>;
}) {
  const usuario = await requireUsuario();
  const { acceso } = await searchParams;
  const primerNombre = usuario.nombre.split(" ")[0];

  return (
    <>
      {acceso === "denegado" && (
        <p role="alert" className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No tienes permiso para acceder a esa sección.
        </p>
      )}
      <EncabezadoPagina titulo={`Hola, ${primerNombre}`} descripcion={NOMBRE_ROL[usuario.rol]} />
      {usuario.rol === "ADMIN" && <ResumenAdmin />}
      {usuario.rol === "SUPERVISOR" && <ResumenSupervisor supervisorId={usuario.id} />}
      {usuario.rol === "VENDEDOR" && <ResumenVendedor usuarioId={usuario.id} />}
    </>
  );
}

function Indicador({ titulo, valor, detalle }: { titulo: string; valor: string | number; detalle?: string }) {
  return (
    <Card>
      <p className="text-sm text-texto-suave">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold">{valor}</p>
      {detalle && <p className="mt-1 text-xs text-texto-suave">{detalle}</p>}
    </Card>
  );
}

async function ResumenAdmin() {
  const [porRol, inactivos, zonas] = await Promise.all([
    db.user.groupBy({ by: ["rol"], where: { activo: true }, _count: true }),
    db.user.count({ where: { activo: false } }),
    db.zona.count({ where: { activa: true } }),
  ]);
  const cuenta = (rol: string) => porRol.find((r) => r.rol === rol)?._count ?? 0;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Indicador titulo="Vendedores activos" valor={cuenta("VENDEDOR")} />
      <Indicador titulo="Supervisores" valor={cuenta("SUPERVISOR")} />
      <Indicador titulo="Usuarios inactivos" valor={inactivos} />
      <Indicador titulo="Zonas activas" valor={zonas} />
      <Card className="col-span-2 md:col-span-4">
        <CardTitulo>Próximos módulos</CardTitulo>
        <p className="mt-1 text-sm text-texto-suave">
          Aquí verás ventas, cumplimiento de metas, embudo y clientes en riesgo cuando se completen las fases
          siguientes. Por ahora puedes revisar el <Link className="text-marca-700 underline" href="/equipo">equipo</Link> y
          la <Link className="text-marca-700 underline" href="/auditoria">auditoría</Link>.
        </p>
      </Card>
    </div>
  );
}

async function ResumenSupervisor({ supervisorId }: { supervisorId: string }) {
  const equipo = await db.user.findMany({
    where: { supervisorId },
    select: { id: true, nombre: true, activo: true, zona: { select: { nombre: true } } },
    orderBy: { nombre: "asc" },
  });
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Indicador titulo="Vendedores en tu equipo" valor={equipo.filter((v) => v.activo).length} />
      <Card className="md:col-span-2">
        <CardTitulo>Tu equipo</CardTitulo>
        <ul className="mt-3 divide-y divide-borde">
          {equipo.map((v) => (
            <li key={v.id} className="flex items-center justify-between py-2 text-sm">
              <span>{v.nombre}</span>
              <span className="flex items-center gap-2 text-texto-suave">
                {v.zona?.nombre ?? "Sin zona"}
                {!v.activo && <Badge tono="rojo">Inactivo</Badge>}
              </span>
            </li>
          ))}
          {equipo.length === 0 && <li className="py-2 text-sm text-texto-suave">Aún no tienes vendedores asignados.</li>}
        </ul>
      </Card>
    </div>
  );
}

async function ResumenVendedor({ usuarioId }: { usuarioId: string }) {
  const yo = await db.user.findUniqueOrThrow({
    where: { id: usuarioId },
    select: { zona: { select: { nombre: true } }, supervisor: { select: { nombre: true } } },
  });
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Indicador titulo="Tu zona" valor={yo.zona?.nombre ?? "Sin asignar"} />
      <Indicador titulo="Tu supervisor" valor={yo.supervisor?.nombre ?? "—"} />
      <Card>
        <CardTitulo>Tu meta del mes</CardTitulo>
        <p className="mt-1 text-sm text-texto-suave">
          Muy pronto verás aquí tu avance, lo que te falta y tu comisión proyectada.
        </p>
      </Card>
    </div>
  );
}
