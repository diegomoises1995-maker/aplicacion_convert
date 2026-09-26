import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getAlcance, requirePermiso } from "@/server/sesion";
import { getConfiguracion } from "@/server/configuracion";
import { filtroVendedor } from "@/lib/alcance";
import { puedeAprobar } from "@/lib/precios";
import { formatFecha, formatSoles } from "@/lib/format";
import { Badge, Card, EncabezadoPagina } from "@/components/ui/card";
import { Vacio } from "@/components/ui/varios";
import { FormularioAprobacion } from "../cotizaciones/[id]/acciones";

export const metadata: Metadata = { title: "Aprobaciones" };

export default async function AprobacionesPage() {
  const usuario = await requirePermiso("descuentos.aprobar");
  const [pendientes, config] = await Promise.all([
    db.aprobacionDescuento.findMany({
      where: { estado: "PENDIENTE", cotizacion: filtroVendedor(await getAlcance(usuario)) },
      include: {
        solicitante: { select: { nombre: true } },
        cotizacion: { include: { cliente: { select: { razonSocial: true, nombreComercial: true } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
    getConfiguracion(),
  ]);

  return (
    <>
      <EncabezadoPagina titulo="Aprobaciones de descuento" descripcion={`Tu límite: ${usuario.rol === "ADMIN" ? "sin límite" : `${config.descuentoMaxSupervisor} %`}`} />
      {pendientes.length === 0 ? (
        <Vacio titulo="No hay descuentos por aprobar" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {pendientes.map((a) => {
            const pct = Number(a.descuentoSolicitado);
            const puede = puedeAprobar(usuario.rol, pct, config);
            return (
              <Card key={a.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link href={`/cotizaciones/${a.cotizacionId}`} className="font-medium text-marca-700">
                      Cotización #{a.cotizacion.numero} · {a.cotizacion.cliente.nombreComercial || a.cotizacion.cliente.razonSocial}
                    </Link>
                    <p className="text-sm text-texto-suave">{a.solicitante.nombre} · {formatFecha(a.createdAt, true)}</p>
                  </div>
                  <Badge tono="amarillo">−{pct} %</Badge>
                </div>
                <p className="mt-2 text-sm">
                  Descuento {formatSoles(a.cotizacion.descuentoMonto)} · Base {formatSoles(a.cotizacion.baseImponible)} · Total {formatSoles(a.cotizacion.total)}
                </p>
                <div className="mt-3 border-t border-borde pt-3">
                  {puede ? <FormularioAprobacion aprobacionId={a.id} /> : <p className="text-sm text-amber-700">Supera tu límite: lo aprueba el gerente.</p>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
