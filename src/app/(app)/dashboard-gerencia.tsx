import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import type { UsuarioActual } from "@/server/sesion";
import type { Alcance } from "@/lib/alcance";
import { filtroEquipo, filtroVendedor } from "@/lib/alcance";
import { tienePermiso } from "@/lib/permisos";
import { embudo, modelosMasVendidos, ventasMensuales, ventasPorZona } from "@/server/dashboard";
import { fraccionPeriodo, indicadoresMeta, metasDelPeriodo, sumarVentas, ventasPorVendedor } from "@/server/indicadores";
import { filtroClientes } from "@/server/clientes";
import { mesAnterior, partesLima, rangoMes, etiquetaMes } from "@/lib/fechas";
import { variacion, type TipoMeta } from "@/lib/metas";
import { NOMBRE_ETAPA } from "@/lib/pipeline";
import { formatFecha, formatNumero, formatPorcentaje, formatSoles } from "@/lib/format";
import { Card, CardTitulo } from "@/components/ui/card";
import { BadgeSemaforo, BarraAvance, Variacion } from "@/components/metas/avance";
import { GraficoVentasMensuales } from "@/components/graficos/ventas-mensuales";
import { BarrasHorizontales, RAMPA_EMBUDO } from "@/components/graficos/barras";
import { FotoModelo } from "@/components/foto-modelo";

function Kpi({ titulo, valor, pie }: { titulo: string; valor: string; pie?: React.ReactNode }) {
  return (
    <Card className="p-3 md:p-4">
      <p className="text-xs text-texto-suave">{titulo}</p>
      <p className="mt-1 text-xl font-semibold md:text-2xl">{valor}</p>
      {pie && <p className="mt-0.5 text-xs text-texto-suave">{pie}</p>}
    </Card>
  );
}

function Seccion({ titulo, href, children, className }: { titulo: string; href?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <div className="mb-3 flex items-center justify-between">
        <CardTitulo>{titulo}</CardTitulo>
        {href && <Link href={href} className="inline-flex items-center gap-1 text-sm text-marca-700">Ver <ArrowRight className="size-3.5" /></Link>}
      </div>
      {children}
    </Card>
  );
}

export async function DashboardGerencia({ usuario, alcance }: { usuario: UsuarioActual; alcance: Alcance }) {
  const { anio, mes } = partesLima();
  const { inicio, fin } = rangoMes(anio, mes);
  const ant = mesAnterior(anio, mes);
  const rAnt = rangoMes(ant.anio, ant.mes);
  const rAA = rangoMes(anio - 1, mes);
  const hace90 = new Date(Date.now() - 90 * 86_400_000);
  const vendedorIds = alcance.tipo === "todos" ? undefined : alcance.ids;

  const [ventasMes, ventasAnt, ventasAA, metas, serie, modelos, zonas, funnel, enRiesgo, vendedores, pendientes] = await Promise.all([
    ventasPorVendedor(inicio, fin, vendedorIds),
    ventasPorVendedor(rAnt.inicio, rAnt.fin, vendedorIds),
    ventasPorVendedor(rAA.inicio, rAA.fin, vendedorIds),
    metasDelPeriodo({ periodo: "MENSUAL", anio, mes }),
    ventasMensuales(alcance, anio, mes),
    modelosMasVendidos(alcance, hace90, fin),
    ventasPorZona(alcance, inicio, fin),
    embudo(alcance),
    db.cliente.findMany({
      where: { AND: [await filtroClientes(usuario), { estado: "EN_RIESGO" }] },
      include: { vendedor: { select: { nombre: true } } },
      orderBy: { ticketPromedio: { sort: "desc", nulls: "last" } },
      take: 6,
    }),
    db.user.findMany({ where: { ...filtroEquipo(alcance), rol: "VENDEDOR", activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    Promise.all([
      db.pedido.count({ where: { ...filtroVendedor(alcance), estado: "PENDIENTE_PAGO" } }),
      tienePermiso(usuario.rol, "pagos.verificar") ? db.pago.count({ where: { verificado: false, pedido: { estado: { not: "CANCELADO" } } } }) : 0,
      db.aprobacionDescuento.count({ where: { estado: "PENDIENTE", cotizacion: filtroVendedor(alcance) } }),
      db.pedido.count({ where: { ...filtroVendedor(alcance), estado: { in: ["PAGO_VERIFICADO", "EN_PREPARACION"] } } }),
    ]),
  ]);

  const total = sumarVentas(ventasMes.values());
  const fraccion = fraccionPeriodo({ periodo: "MENSUAL", anio, mes });
  const sumaIndividual = (t: TipoMeta) => {
    const v = vendedores.map((u) => metas.individual(u.id, t)).filter((x): x is number => x !== null);
    return v.length ? v.reduce((a, b) => a + b, 0) : null;
  };
  const metaDe = (t: TipoMeta) => (usuario.rol === "ADMIN" ? metas.empresa(t) : metas.equipo(usuario.id, t)) ?? sumaIndividual(t);
  const [indSoles] = await indicadoresMeta(total, metaDe, fraccion);
  const porVendedor = await Promise.all(
    vendedores.map(async (u) => ({ u, ind: (await indicadoresMeta(ventasMes.get(u.id), (t) => metas.individual(u.id, t), fraccion))[0]! })),
  );
  porVendedor.sort((a, b) => (b.ind.cumplimiento ?? -1) - (a.ind.cumplimiento ?? -1));
  const [pendPago, pagosPorVerificar, aprobaciones, porDespachar] = pendientes;
  const abiertas = funnel.filter((f) => f.etapa !== "GANADO" && f.etapa !== "PERDIDO");
  const ganadas = funnel.find((f) => f.etapa === "GANADO")!;
  const perdidas = funnel.find((f) => f.etapa === "PERDIDO")!;
  const conversion = ganadas.cantidad + perdidas.cantidad ? ganadas.cantidad / (ganadas.cantidad + perdidas.cantidad) : null;

  return (
    <div className="space-y-4">
      {(pendPago + pagosPorVerificar + aprobaciones + porDespachar > 0) && (
        <div className="flex flex-wrap gap-2 text-sm">
          {aprobaciones > 0 && <Link href="/aprobaciones" className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-800">{aprobaciones} descuento(s) por aprobar</Link>}
          {pagosPorVerificar > 0 && <Link href="/pedidos?estado=PENDIENTE_PAGO" className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-800">{pagosPorVerificar} pago(s) por verificar</Link>}
          {pendPago > 0 && <Link href="/pedidos?estado=PENDIENTE_PAGO" className="rounded-full bg-stone-100 px-3 py-1.5">{pendPago} pedido(s) pendientes de pago</Link>}
          {porDespachar > 0 && <Link href="/pedidos?estado=PAGO_VERIFICADO" className="rounded-full bg-stone-100 px-3 py-1.5">{porDespachar} pedido(s) por despachar</Link>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          titulo={`Ventas ${etiquetaMes(anio, mes)} (sin IGV)`}
          valor={formatSoles(total.soles)}
          pie={<>vs mes ant. <Variacion v={variacion(total.soles, sumarVentas(ventasAnt.values()).soles)} /> · vs año ant. <Variacion v={variacion(total.soles, sumarVentas(ventasAA.values()).soles)} /></>}
        />
        <Kpi titulo="Cumplimiento del equipo" valor={formatPorcentaje(indSoles!.cumplimiento)} pie={<BadgeSemaforo s={indSoles!.semaforo} />} />
        <Kpi titulo="Pedidos / pares" valor={`${total.pedidos} / ${formatNumero(total.pares)}`} pie={`Ticket prom. ${formatSoles(total.pedidos ? total.soles / total.pedidos : 0)}`} />
        <Kpi titulo="Clientes nuevos" valor={String(total.nuevos)} pie={`${total.reactivados} reactivados`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Seccion titulo="Ventas mensuales" className="lg:col-span-2" href="/reportes">
          <GraficoVentasMensuales datos={serie} />
        </Seccion>
        <Seccion titulo="Cumplimiento por vendedor" href="/metas">
          {indSoles!.meta !== null && <div className="mb-4"><BarraAvance {...indSoles!} fraccion={fraccion} /></div>}
          <ul className="space-y-3">
            {porVendedor.map(({ u, ind }) => (
              <li key={u.id}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm"><span className="font-medium">{u.nombre}</span><BadgeSemaforo s={ind.semaforo} /></div>
                <BarraAvance {...ind} fraccion={fraccion} compacta />
              </li>
            ))}
          </ul>
        </Seccion>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Seccion titulo="Embudo de conversión" href="/pipeline">
          <BarrasHorizontales
            filas={abiertas.map((f) => ({ etiqueta: `${NOMBRE_ETAPA[f.etapa]} (${f.cantidad})`, valor: f.valor }))}
            formato={formatSoles}
            colores={RAMPA_EMBUDO}
          />
          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-borde pt-3 text-center text-sm">
            <div><dt className="text-xs text-texto-suave">Ganadas (90 d)</dt><dd className="font-semibold">{ganadas.cantidad}</dd></div>
            <div><dt className="text-xs text-texto-suave">Perdidas (90 d)</dt><dd className="font-semibold">{perdidas.cantidad}</dd></div>
            <div><dt className="text-xs text-texto-suave">Conversión</dt><dd className="font-semibold">{formatPorcentaje(conversion)}</dd></div>
          </dl>
        </Seccion>
        <Seccion titulo="Ventas por zona (mes)">
          {zonas.length ? (
            <BarrasHorizontales filas={zonas.map((z) => ({ etiqueta: z.zona, valor: z.soles, detalle: `${z.clientes} cliente${z.clientes === 1 ? "" : "s"}` }))} formato={formatSoles} />
          ) : <p className="text-sm text-texto-suave">Sin ventas este mes.</p>}
        </Seccion>
        <Seccion titulo="Modelos más vendidos (90 días)" href="/catalogo">
          <ul className="space-y-2">
            {modelos.map((m, i) => (
              <li key={m.id} className="flex items-center gap-3">
                <span className="w-4 text-sm text-texto-suave">{i + 1}</span>
                <FotoModelo src={m.foto} alt={m.nombre} className="size-10 shrink-0 rounded-md" />
                <Link href={`/catalogo/${m.id}`} className="min-w-0 flex-1 truncate text-sm font-medium">{m.nombre}</Link>
                <span className="shrink-0 text-right text-sm">{formatNumero(m.pares)} pares<span className="block text-xs text-texto-suave">{formatSoles(m.soles)}</span></span>
              </li>
            ))}
          </ul>
        </Seccion>
      </div>

      <Seccion titulo="Clientes en riesgo" href="/clientes?estado=EN_RIESGO">
        {enRiesgo.length ? (
          <ul className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {enRiesgo.map((c) => (
              <li key={c.id}>
                <Link href={`/clientes/${c.id}`} className="block rounded-lg border border-borde p-3 hover:bg-fondo">
                  <p className="truncate font-medium">{c.nombreComercial || c.razonSocial}</p>
                  <p className="text-xs text-texto-suave">
                    Última compra {formatFecha(c.ultimaCompra)} · compra c/ {c.frecuenciaDias ?? "—"} días · ticket {formatSoles(c.ticketPromedio)}
                  </p>
                  <p className="text-xs text-texto-suave">{c.vendedor?.nombre ?? "Sin asignar"}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-texto-suave">Ningún cliente en riesgo. 🎉</p>}
      </Seccion>
    </div>
  );
}
