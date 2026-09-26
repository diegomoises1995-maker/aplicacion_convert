import type { Metadata } from "next";
import { db } from "@/lib/db";
import { filtroEquipo } from "@/lib/alcance";
import { requirePermiso, getAlcance } from "@/server/sesion";
import { NOMBRE_ROL } from "@/lib/permisos";
import { formatFecha } from "@/lib/format";
import { Badge, Card, EncabezadoPagina } from "@/components/ui/card";

export const metadata: Metadata = { title: "Equipo" };

const CANAL = { CAMPO: "Campo", REMOTO: "WhatsApp / teléfono", MIXTO: "Mixto" } as const;

export default async function EquipoPage() {
  const usuario = await requirePermiso("equipo.ver");
  const alcance = await getAlcance(usuario);

  const miembros = await db.user.findMany({
    where: filtroEquipo(alcance),
    select: {
      id: true,
      nombre: true,
      email: true,
      telefono: true,
      rol: true,
      canal: true,
      activo: true,
      ultimoAcceso: true,
      zona: { select: { nombre: true } },
      supervisor: { select: { nombre: true } },
    },
    orderBy: [{ activo: "desc" }, { rol: "asc" }, { nombre: "asc" }],
  });

  return (
    <>
      <EncabezadoPagina
        titulo="Equipo"
        descripcion={usuario.rol === "ADMIN" ? "Todos los usuarios de la empresa" : "Vendedores de tu equipo"}
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {miembros.map((m) => (
          <Card key={m.id} className={m.activo ? "" : "opacity-60"}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{m.nombre}</p>
                <p className="truncate text-sm text-texto-suave">{m.email}</p>
              </div>
              <Badge tono={m.activo ? "verde" : "rojo"}>{m.activo ? "Activo" : "Inactivo"}</Badge>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <dt className="text-texto-suave">Rol</dt>
              <dd>{NOMBRE_ROL[m.rol]}</dd>
              <dt className="text-texto-suave">Zona</dt>
              <dd>{m.zona?.nombre ?? "—"}</dd>
              <dt className="text-texto-suave">Supervisor</dt>
              <dd>{m.supervisor?.nombre ?? "—"}</dd>
              <dt className="text-texto-suave">Canal</dt>
              <dd>{CANAL[m.canal]}</dd>
              <dt className="text-texto-suave">Último acceso</dt>
              <dd>{formatFecha(m.ultimoAcceso, true)}</dd>
            </dl>
          </Card>
        ))}
      </div>
    </>
  );
}
