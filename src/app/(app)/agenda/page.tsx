import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { getAlcance, requireUsuario } from "@/server/sesion";
import { vendedoresAsignables } from "@/server/clientes";
import { listarActividades } from "@/server/actividades";
import { alcanceIncluye, filtroVendedor } from "@/lib/alcance";
import { clasificarAgenda } from "@/lib/actividades";
import { hoyLima } from "@/lib/fechas";
import { formatFecha } from "@/lib/format";
import { Card, CardTitulo, EncabezadoPagina } from "@/components/ui/card";
import { BotonLink, Vacio } from "@/components/ui/varios";
import { Select } from "@/components/ui/campos";
import { Button } from "@/components/ui/button";
import { ItemActividad } from "@/components/seguimiento/item-actividad";
import { AlertasRecompra } from "./alertas";

export const metadata: Metadata = { title: "Agenda" };

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ vendedor?: string }> }) {
  const usuario = await requireUsuario();
  const { vendedor } = await searchParams;
  const alcance = await getAlcance(usuario);
  const { inicio, fin } = hoyLima();
  const en7dias = new Date(fin.getTime() + 7 * 86_400_000);

  // Por defecto cada uno ve su propia agenda; supervisores/gerente pueden ver la de su equipo.
  const verVendedor = vendedor === "todos" ? null : (vendedor ?? usuario.id);
  if (verVendedor && !alcanceIncluye(alcance, verVendedor)) return <Vacio titulo="Sin acceso a esa agenda" />;
  const filtro = verVendedor ? { vendedorId: verVendedor } : filtroVendedor(alcance);

  const [pendientes, hechasHoy, vendedores] = await Promise.all([
    listarActividades({ ...filtro, completada: false, fechaProgramada: { lt: en7dias } }, { conVendedor: !verVendedor }),
    listarActividades({ ...filtro, completada: true, fechaRealizada: { gte: inicio, lt: fin } }, { orden: "desc", conVendedor: !verVendedor }),
    usuario.rol === "VENDEDOR" ? [] : vendedoresAsignables(usuario),
  ]);
  const { vencidas, hoy, proximas } = clasificarAgenda(pendientes, inicio, fin);
  const vendedorAlertas = verVendedor ?? undefined;

  return (
    <>
      <EncabezadoPagina
        titulo="Agenda"
        descripcion={formatFecha(new Date())}
        acciones={<BotonLink href="/agenda/nueva"><Plus className="size-4" aria-hidden /> Actividad</BotonLink>}
      />
      {vendedores.length > 0 && (
        <form className="mb-4 flex gap-2">
          <Select name="vendedor" defaultValue={vendedor ?? usuario.id} className="max-w-xs">
            <option value={usuario.id}>Mi agenda</option>
            <option value="todos">Todo el equipo</option>
            {vendedores.filter((v) => v.id !== usuario.id).map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
          </Select>
          <Button type="submit" variante="secundario">Ver</Button>
        </form>
      )}

      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <Resumen titulo="Vencidas" valor={vencidas.length} tono="text-red-700" />
        <Resumen titulo="Para hoy" valor={hoy.length} tono="text-marca-700" />
        <Resumen titulo="Hechas hoy" valor={hechasHoy.length} tono="text-emerald-700" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {vencidas.length > 0 && (
            <Seccion titulo={`Seguimientos vencidos (${vencidas.length})`}>
              {vencidas.map((a) => <ItemActividad key={a.id} a={a} vencida />)}
            </Seccion>
          )}
          <Seccion titulo="Hoy">
            {hoy.length ? hoy.map((a) => <ItemActividad key={a.id} a={a} />) : <li className="p-4 text-sm text-texto-suave">Nada pendiente para hoy.</li>}
          </Seccion>
          <Seccion titulo="Próximos 7 días">
            {proximas.length ? proximas.map((a) => <ItemActividad key={a.id} a={a} />) : <li className="p-4 text-sm text-texto-suave">Sin actividades programadas.</li>}
          </Seccion>
          {hechasHoy.length > 0 && (
            <Seccion titulo="Realizadas hoy">
              {hechasHoy.map((a) => <ItemActividad key={a.id} a={a} />)}
            </Seccion>
          )}
        </div>
        <div>
          <AlertasRecompra usuario={usuario} vendedorId={vendedorAlertas} />
        </div>
      </div>
    </>
  );
}

function Resumen({ titulo, valor, tono }: { titulo: string; valor: number; tono: string }) {
  return (
    <Card className="p-3 md:p-4">
      <p className="text-xs text-texto-suave">{titulo}</p>
      <p className={`text-2xl font-semibold ${tono}`}>{valor}</p>
    </Card>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Card className="p-0 md:p-0">
      <CardTitulo className="border-b border-borde px-4 py-3">{titulo}</CardTitulo>
      <ul className="divide-y divide-borde">{children}</ul>
    </Card>
  );
}

