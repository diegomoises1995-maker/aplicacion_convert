import Link from "next/link";
import { BellRing } from "lucide-react";
import { db } from "@/lib/db";
import { getAlcance, type UsuarioActual } from "@/server/sesion";
import { numeroWhatsApp } from "@/lib/clientes";
import { formatFecha, formatSoles } from "@/lib/format";
import { Card, CardTitulo } from "@/components/ui/card";
import { BotonAtendida } from "./boton-atendida";
import { BotonWhatsApp } from "@/components/seguimiento/boton-whatsapp";

/** Clientes que superaron su frecuencia habitual de compra sin pedir. */
export async function AlertasRecompra({ usuario, vendedorId }: { usuario: UsuarioActual; vendedorId?: string }) {
  const alcance = await getAlcance(usuario);
  const filtro = vendedorId ? { vendedorId } : alcance.tipo === "todos" ? {} : { vendedorId: { in: alcance.ids } };
  const [alertas, plantillas] = await Promise.all([
    db.alertaRecompra.findMany({
      where: { atendida: false, ...filtro },
      include: { cliente: true, vendedor: { select: { nombre: true } } },
      orderBy: [{ diasSinCompra: "desc" }],
      take: 20,
    }),
    db.plantillaWhatsApp.findMany({ where: { activa: true }, select: { id: true, nombre: true, mensaje: true } }),
  ]);
  // La plantilla de recompra primero
  const orden = [...plantillas].sort((a, b) => Number(b.nombre.toLowerCase().includes("recompra")) - Number(a.nombre.toLowerCase().includes("recompra")));

  return (
    <Card className="p-0 md:p-0">
      <div className="flex items-center gap-2 border-b border-borde px-4 py-3">
        <BellRing className="size-4 text-amber-600" aria-hidden />
        <CardTitulo>Alertas de recompra ({alertas.length})</CardTitulo>
      </div>
      <ul className="divide-y divide-borde">
        {alertas.map((a) => {
          const wa = numeroWhatsApp(a.cliente.whatsapp ?? a.cliente.telefono);
          return (
            <li key={a.id} className="space-y-2 p-4">
              <div>
                <Link href={`/clientes/${a.clienteId}`} className="font-medium text-marca-700">{a.cliente.nombreComercial || a.cliente.razonSocial}</Link>
                <p className="text-xs text-texto-suave">
                  {a.diasSinCompra} días sin comprar (suele cada {a.frecuenciaDias}) · última {formatFecha(a.cliente.ultimaCompra)} · ticket {formatSoles(a.cliente.ticketPromedio)}
                  {usuario.rol !== "VENDEDOR" && a.vendedor && ` · ${a.vendedor.nombre}`}
                </p>
              </div>
              <div className="flex gap-2">
                {wa && (
                  <BotonWhatsApp
                    className="flex-1"
                    clienteId={a.clienteId}
                    numero={wa}
                    plantillas={orden}
                    variables={{
                      cliente: a.cliente.nombreComercial || a.cliente.razonSocial,
                      contacto: a.cliente.contactoNombre?.split(" ")[0] ?? "",
                      vendedor: usuario.nombre.split(" ")[0],
                      empresa: "Convert",
                    }}
                  />
                )}
                <BotonAtendida id={a.id} />
              </div>
            </li>
          );
        })}
        {alertas.length === 0 && <li className="p-4 text-sm text-texto-suave">Sin alertas: todos tus clientes están comprando a su ritmo.</li>}
      </ul>
    </Card>
  );
}
