import type { Metadata } from "next";
import { Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getAlcance, requireUsuario } from "@/server/sesion";
import { vendedoresAsignables } from "@/server/clientes";
import { alcanceIncluye, filtroVendedor } from "@/lib/alcance";
import { resumenPipeline } from "@/lib/pipeline";
import { formatSoles } from "@/lib/format";
import { Card, EncabezadoPagina } from "@/components/ui/card";
import { BotonLink } from "@/components/ui/varios";
import { Select } from "@/components/ui/campos";
import { Button } from "@/components/ui/button";
import { Kanban } from "./kanban";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PipelinePage({ searchParams }: { searchParams: Promise<{ vendedor?: string; cerradas?: string }> }) {
  const usuario = await requireUsuario();
  const { vendedor, cerradas } = await searchParams;
  const alcance = await getAlcance(usuario);
  const hace60 = new Date(Date.now() - 60 * 86_400_000);

  const where: Prisma.OportunidadWhereInput = {
    ...(vendedor && alcanceIncluye(alcance, vendedor) ? { vendedorId: vendedor } : filtroVendedor(alcance)),
    // Las cerradas hace más de 60 días se ocultan salvo que se pidan
    ...(cerradas === "todas" ? {} : { OR: [{ fechaCierreReal: null }, { fechaCierreReal: { gte: hace60 } }] }),
  };

  const [ops, vendedores] = await Promise.all([
    db.oportunidad.findMany({
      where,
      include: {
        cliente: { select: { id: true, razonSocial: true, nombreComercial: true } },
        vendedor: { select: { nombre: true } },
      },
      orderBy: [{ orden: "asc" }, { updatedAt: "desc" }],
    }),
    usuario.rol === "VENDEDOR" ? [] : vendedoresAsignables(usuario),
  ]);
  const tarjetas = ops.map((o) => ({
    id: o.id,
    titulo: o.titulo,
    etapa: o.etapa,
    valorEstimado: Number(o.valorEstimado),
    fechaCierreProbable: o.fechaCierreProbable?.toISOString() ?? null,
    motivoPerdida: o.motivoPerdida,
    cliente: o.cliente.nombreComercial || o.cliente.razonSocial,
    vendedor: usuario.rol === "VENDEDOR" ? null : o.vendedor.nombre,
  }));
  const r = resumenPipeline(tarjetas);

  return (
    <>
      <EncabezadoPagina
        titulo="Pipeline"
        descripcion="Arrastra las tarjetas entre etapas (en el celular usa «Mover a»)"
        acciones={<BotonLink href="/pipeline/nueva"><Plus className="size-4" aria-hidden /> Oportunidad</BotonLink>}
      />
      <div className="mb-4 grid grid-cols-3 gap-2 md:gap-3">
        <Card className="p-3 md:p-4"><p className="text-xs text-texto-suave">Abiertas</p><p className="text-xl font-semibold">{r.abiertas}</p></Card>
        <Card className="p-3 md:p-4"><p className="text-xs text-texto-suave">Pronóstico ponderado</p><p className="text-xl font-semibold">{formatSoles(r.ponderado)}</p></Card>
        <Card className="p-3 md:p-4"><p className="text-xs text-texto-suave">Conversión</p><p className="text-xl font-semibold">{r.conversion === null ? "—" : `${Math.round(r.conversion * 100)} %`}</p></Card>
      </div>
      <form className="mb-4 flex flex-wrap gap-2">
        {vendedores.length > 0 && (
          <Select name="vendedor" defaultValue={vendedor ?? ""} className="max-w-xs">
            <option value="">Todo el equipo</option>
            {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
          </Select>
        )}
        <Select name="cerradas" defaultValue={cerradas ?? ""} className="max-w-xs">
          <option value="">Cerradas: últimos 60 días</option>
          <option value="todas">Cerradas: todas</option>
        </Select>
        <Button type="submit" variante="secundario">Filtrar</Button>
      </form>
      <Kanban inicial={tarjetas} />
    </>
  );
}
