import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getAlcance, requirePermiso } from "@/server/sesion";
import { alcanceIncluye, filtroEquipo } from "@/lib/alcance";
import { NOMBRE_ROL, tienePermiso } from "@/lib/permisos";
import { formatFecha } from "@/lib/format";
import { Badge, Card, CardTitulo, EncabezadoPagina } from "@/components/ui/card";
import { Dato } from "@/components/ui/varios";
import { FormularioUsuario } from "../formulario-usuario";
import { FormularioReasignarCartera, FormularioRestablecer } from "../acciones-usuario";

export const metadata: Metadata = { title: "Usuario" };

export default async function UsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yo = await requirePermiso("equipo.ver");
  const alcance = await getAlcance(yo);
  if (!alcanceIncluye(alcance, id)) notFound();

  const usuario = await db.user.findUnique({
    where: { id },
    include: {
      zona: { select: { nombre: true } },
      supervisor: { select: { nombre: true } },
      _count: { select: { clientes: true } },
    },
  });
  if (!usuario) notFound();

  const esAdmin = tienePermiso(yo.rol, "usuarios.gestionar");
  const [zonas, supervisores, vendedores, historial] = await Promise.all([
    esAdmin ? db.zona.findMany({ where: { activa: true }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }) : [],
    esAdmin ? db.user.findMany({ where: { rol: "SUPERVISOR", activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }) : [],
    db.user.findMany({
      where: { ...filtroEquipo(alcance), activo: true, rol: { not: "ADMIN" }, NOT: { id } },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    db.clienteAsignacionHistorial.findMany({
      where: { OR: [{ desdeVendedorId: id }, { haciaVendedorId: id }] },
      include: {
        cliente: { select: { id: true, razonSocial: true } },
        desdeVendedor: { select: { nombre: true } },
        haciaVendedor: { select: { nombre: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <>
      <EncabezadoPagina
        titulo={usuario.nombre}
        descripcion={`${NOMBRE_ROL[usuario.rol]} · ${usuario.email}`}
        acciones={<Badge tono={usuario.activo ? "verde" : "rojo"}>{usuario.activo ? "Activo" : "Inactivo"}</Badge>}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {esAdmin ? (
            <Card>
              <CardTitulo className="mb-4">Datos del usuario</CardTitulo>
              <FormularioUsuario usuario={usuario} zonas={zonas} supervisores={supervisores} />
            </Card>
          ) : (
            <Card>
              <dl className="grid grid-cols-2 gap-3">
                <Dato etiqueta="Zona">{usuario.zona?.nombre ?? "—"}</Dato>
                <Dato etiqueta="Supervisor">{usuario.supervisor?.nombre ?? "—"}</Dato>
                <Dato etiqueta="Celular">{usuario.telefono ?? "—"}</Dato>
                <Dato etiqueta="Último acceso">{formatFecha(usuario.ultimoAcceso, true)}</Dato>
              </dl>
            </Card>
          )}
          <Card>
            <CardTitulo>Historial de asignaciones</CardTitulo>
            <ul className="mt-2 divide-y divide-borde text-sm">
              {historial.map((h) => (
                <li key={h.id} className="py-2">
                  <Link href={`/clientes/${h.cliente.id}`} className="font-medium text-marca-700">{h.cliente.razonSocial}</Link>
                  <p className="text-texto-suave">
                    {h.desdeVendedor?.nombre ?? "Sin asignar"} → {h.haciaVendedor?.nombre ?? "Sin asignar"} · {formatFecha(h.createdAt)}
                    {h.motivo ? ` · ${h.motivo}` : ""}
                  </p>
                </li>
              ))}
              {historial.length === 0 && <li className="py-2 text-texto-suave">Sin movimientos.</li>}
            </ul>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardTitulo>Cartera</CardTitulo>
            <p className="mt-1 text-2xl font-semibold">{usuario._count.clientes} clientes</p>
            <Link href={`/clientes?vendedor=${usuario.id}`} className="text-sm text-marca-700">Ver clientes →</Link>
            {tienePermiso(yo.rol, "clientes.reasignar") && usuario._count.clientes > 0 && (
              <div className="mt-4 border-t border-borde pt-4">
                <FormularioReasignarCartera desdeId={usuario.id} vendedores={vendedores} />
              </div>
            )}
          </Card>
          {esAdmin && (
            <Card>
              <CardTitulo className="mb-3">Acceso</CardTitulo>
              <FormularioRestablecer id={usuario.id} />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
