import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import type { UsuarioActual } from "@/server/sesion";
import { calcularComisionMes, fraccionPeriodo, indicadoresMeta, metasDelPeriodo, ventasPorVendedor } from "@/server/indicadores";
import { listarActividades } from "@/server/actividades";
import { ventasMensuales } from "@/server/dashboard";
import { clasificarAgenda } from "@/lib/actividades";
import { diasEnMes, hoyLima, partesLima, rangoMes } from "@/lib/fechas";
import { proyeccion } from "@/lib/metas";
import { formatFecha, formatSoles } from "@/lib/format";
import { Card, CardTitulo } from "@/components/ui/card";
import { BadgeSemaforo, BarraAvance } from "@/components/metas/avance";
import { ItemActividad } from "@/components/seguimiento/item-actividad";
import { GraficoVentasMensuales } from "@/components/graficos/ventas-mensuales";

export async function DashboardVendedor({ usuario }: { usuario: UsuarioActual }) {
  const { anio, mes, dia } = partesLima();
  const { inicio, fin } = rangoMes(anio, mes);
  const hoy = hoyLima();
  const [ventas, metas, comision, pendientes, porRecomprar, serie] = await Promise.all([
    ventasPorVendedor(inicio, fin, [usuario.id]),
    metasDelPeriodo({ periodo: "MENSUAL", anio, mes }),
    calcularComisionMes(usuario.id, anio, mes),
    listarActividades({ vendedorId: usuario.id, completada: false, fechaProgramada: { lt: hoy.fin } }),
    db.alertaRecompra.findMany({
      where: { vendedorId: usuario.id, atendida: false },
      include: { cliente: true },
      orderBy: { diasSinCompra: "desc" },
      take: 5,
    }),
    ventasMensuales({ tipo: "vendedores", ids: [usuario.id] }, anio, mes),
  ]);
  const fraccion = fraccionPeriodo({ periodo: "MENSUAL", anio, mes });
  const ind = await indicadoresMeta(ventas.get(usuario.id), (t) => metas.individual(usuario.id, t), fraccion);
  const soles = ind[0]!;
  const falta = soles.meta !== null ? Math.max(0, soles.meta - soles.real) : null;
  const diasRestantes = diasEnMes(anio, mes) - dia + 1;
  const { vencidas, hoy: deHoy } = clasificarAgenda(pendientes, hoy.inicio, hoy.fin);

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <CardTitulo>Tu meta del mes</CardTitulo>
          <BadgeSemaforo s={soles.semaforo} />
        </div>
        <BarraAvance {...soles} fraccion={fraccion} compacta />
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div>
            <dt className="text-texto-suave">Te falta</dt>
            <dd className="text-lg font-semibold">{falta === null ? "Sin meta" : falta === 0 ? "¡Meta cumplida!" : formatSoles(falta)}</dd>
          </div>
          <div>
            <dt className="text-texto-suave">{falta === 0 ? "Sobre la meta" : `Por día (restan ${diasRestantes})`}</dt>
            <dd className="text-lg font-semibold">
              {falta === null ? "—" : falta === 0 ? `+${formatSoles(soles.real - (soles.meta ?? 0))}` : formatSoles(falta / diasRestantes)}
            </dd>
          </div>
          <div>
            <dt className="text-texto-suave">Proyección al cierre</dt>
            <dd className="text-lg font-semibold">{formatSoles(proyeccion(soles.real, fraccion))}</dd>
          </div>
          <div>
            <dt className="text-texto-suave">Comisión proyectada</dt>
            <dd className="text-lg font-semibold text-marca-700">
              <Link href="/comisiones">{formatSoles(comision.total)}</Link>
            </dd>
          </div>
        </dl>
        <div className="mt-4 grid gap-4 border-t border-borde pt-4 sm:grid-cols-3">
          {ind.slice(1).map((i) => <BarraAvance key={i.tipo} {...i} fraccion={fraccion} />)}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-0 md:p-0">
          <div className="flex items-center justify-between border-b border-borde px-4 py-3">
            <CardTitulo>Seguimientos de hoy</CardTitulo>
            <Link href="/agenda" className="inline-flex items-center gap-1 text-sm text-marca-700">Agenda <ArrowRight className="size-3.5" /></Link>
          </div>
          <ul className="divide-y divide-borde">
            {[...vencidas.map((a) => ({ a, v: true })), ...deHoy.map((a) => ({ a, v: false }))].slice(0, 6).map(({ a, v }) => (
              <ItemActividad key={a.id} a={a} vencida={v} />
            ))}
            {vencidas.length + deHoy.length === 0 && <li className="p-4 text-sm text-texto-suave">Nada pendiente para hoy.</li>}
          </ul>
          {vencidas.length + deHoy.length > 6 && <p className="px-4 pb-3 text-xs text-texto-suave">y {vencidas.length + deHoy.length - 6} más en la agenda</p>}
        </Card>
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <CardTitulo>Clientes por recomprar</CardTitulo>
            <Link href="/agenda" className="inline-flex items-center gap-1 text-sm text-marca-700">Ver <ArrowRight className="size-3.5" /></Link>
          </div>
          <ul className="divide-y divide-borde text-sm">
            {porRecomprar.map((a) => (
              <li key={a.id}>
                <Link href={`/clientes/${a.clienteId}`} className="block py-2">
                  <span className="font-medium">{a.cliente.nombreComercial || a.cliente.razonSocial}</span>
                  <span className="block text-xs text-texto-suave">
                    {a.diasSinCompra} días sin comprar · suele comprar cada {a.frecuenciaDias} días · última {formatFecha(a.cliente.ultimaCompra)}
                  </span>
                </Link>
              </li>
            ))}
            {porRecomprar.length === 0 && <li className="py-2 text-texto-suave">Tu cartera está al día.</li>}
          </ul>
        </Card>
      </div>

      <Card>
        <CardTitulo className="mb-3">Tus ventas mensuales</CardTitulo>
        <GraficoVentasMensuales datos={serie} />
      </Card>
    </div>
  );
}
