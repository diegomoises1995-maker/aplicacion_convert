import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUsuario } from "@/server/sesion";
import { tienePermiso } from "@/lib/permisos";
import { NOMBRE_GENERO, textoCurva } from "@/lib/catalogo";
import { paresPorSerie, seriesDisponibles, tallasDe, type Distribucion } from "@/lib/stock";
import { formatSoles } from "@/lib/format";
import { Badge, Card, CardTitulo, EncabezadoPagina } from "@/components/ui/card";
import { FotoModelo } from "@/components/foto-modelo";
import { FormularioModelo } from "../formulario-modelo";
import { FormularioColor, FormularioStock } from "./stock";

export const metadata: Metadata = { title: "Modelo" };

export default async function ModeloPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await requireUsuario();
  const gestiona = tienePermiso(usuario.rol, "catalogo.gestionar");
  const modelo = await db.modelo.findUnique({
    where: { id },
    include: { curva: true, variantes: { include: { color: true }, orderBy: [{ colorId: "asc" }, { talla: "asc" }] } },
  });
  if (!modelo || (!modelo.activo && !gestiona)) notFound();

  const d = modelo.curva.distribucion as Distribucion;
  const tallas = tallasDe(d);
  const colores = new Map<string, { id: string; nombre: string; hex: string | null; variantes: typeof modelo.variantes }>();
  for (const v of modelo.variantes) {
    const c = colores.get(v.colorId) ?? { id: v.colorId, nombre: v.color.nombre, hex: v.color.hex, variantes: [] };
    c.variantes.push(v);
    colores.set(v.colorId, c);
  }
  const filas = [...colores.values()].map((c) => ({
    ...c,
    stock: Object.fromEntries(c.variantes.map((v) => [String(v.talla), v.stock])) as Record<string, number>,
  }));
  const curvas = gestiona ? await db.curvaTallas.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }) : [];

  return (
    <>
      <EncabezadoPagina
        titulo={modelo.nombre}
        descripcion={`${modelo.sku} · ${NOMBRE_GENERO[modelo.genero]} · ${modelo.material}`}
        acciones={!modelo.activo && <Badge tono="rojo">Inactivo</Badge>}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden p-0 md:p-0">
          <FotoModelo src={modelo.fotos[0]} alt={modelo.nombre} className="aspect-[4/3] w-full" />
          {modelo.fotos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-3">
              {modelo.fotos.slice(1).map((f) => <FotoModelo key={f} src={f} alt={modelo.nombre} className="size-16 shrink-0 rounded-lg" />)}
            </div>
          )}
          <div className="p-4">
            <p className="text-2xl font-semibold text-marca-700">{formatSoles(modelo.precioBase)} <span className="text-sm font-normal text-texto-suave">por par, sin IGV</span></p>
            <p className="mt-1 text-sm text-texto-suave">
              Serie de {paresPorSerie(d)} pares ({modelo.curva.nombre}): {textoCurva(d)}
            </p>
            <p className="text-sm text-texto-suave">Precio por serie: {formatSoles(Number(modelo.precioBase) * paresPorSerie(d))}</p>
            {gestiona && modelo.costo && (
              <p className="mt-1 text-xs text-texto-suave">
                Costo {formatSoles(modelo.costo)} · margen {Math.round((1 - Number(modelo.costo) / Number(modelo.precioBase)) * 100)} %
              </p>
            )}
            {modelo.descripcion && <p className="mt-3 text-sm">{modelo.descripcion}</p>}
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardTitulo>Stock por color y talla</CardTitulo>
            {filas.length === 0 ? (
              <p className="mt-2 text-sm text-texto-suave">Aún no hay colores cargados.</p>
            ) : gestiona ? (
              <FormularioStock modeloId={modelo.id} tallas={tallas} filas={filas.map((f) => ({ id: f.id, nombre: f.nombre, hex: f.hex, series: seriesDisponibles(d, f.stock), variantes: f.variantes.map((v) => ({ id: v.id, talla: v.talla, stock: v.stock })) }))} />
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-center text-sm">
                  <thead className="text-xs text-texto-suave">
                    <tr><th className="p-2 text-left">Color</th>{tallas.map((t) => <th key={t} className="p-2">{t}</th>)}<th className="p-2">Series</th></tr>
                  </thead>
                  <tbody className="divide-y divide-borde">
                    {filas.map((f) => (
                      <tr key={f.id}>
                        <td className="p-2 text-left"><span className="mr-2 inline-block size-3 rounded-full border border-borde align-middle" style={{ background: f.hex ?? "#ccc" }} />{f.nombre}</td>
                        {tallas.map((t) => <td key={t} className={`p-2 ${(f.stock[String(t)] ?? 0) < (d[String(t)] ?? 0) ? "text-red-600" : ""}`}>{f.stock[String(t)] ?? 0}</td>)}
                        <td className="p-2 font-semibold">{seriesDisponibles(d, f.stock)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {gestiona && (
              <div className="mt-4 border-t border-borde pt-4">
                <FormularioColor modeloId={modelo.id} />
              </div>
            )}
          </Card>
          {gestiona && (
            <Card>
              <CardTitulo className="mb-4">Datos del modelo</CardTitulo>
              <FormularioModelo
                curvas={curvas}
                modelo={{ ...modelo, precioBase: Number(modelo.precioBase), costo: modelo.costo === null ? null : Number(modelo.costo) }}
              />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
