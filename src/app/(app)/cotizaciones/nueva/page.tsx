import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getAlcance, requireUsuario } from "@/server/sesion";
import { filtroClientes, puedeVerCliente } from "@/server/clientes";
import { getConfiguracion } from "@/server/configuracion";
import { catalogoParaCotizar, contextoPrecios } from "@/server/precios";
import { alcanceIncluye } from "@/lib/alcance";
import { EncabezadoPagina } from "@/components/ui/card";
import { Cotizador } from "./cotizador";

export const metadata: Metadata = { title: "Nueva cotización" };

export default async function NuevaCotizacionPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; oportunidad?: string; desde?: string }>;
}) {
  const usuario = await requireUsuario();
  const sp = await searchParams;
  const [clientes, config, catalogo] = await Promise.all([
    db.cliente.findMany({
      where: await filtroClientes(usuario),
      select: { id: true, razonSocial: true, nombreComercial: true },
      orderBy: { razonSocial: "asc" },
    }),
    getConfiguracion(),
    catalogoParaCotizar(),
  ]);

  // Duplicar una cotización anterior
  let base: { clienteId: string; lineas: { modeloId: string; colorId: string; series: number }[]; descuento: number; notas: string | null } | null = null;
  if (sp.desde) {
    const c = await db.cotizacion.findUnique({ where: { id: sp.desde }, include: { items: true } });
    if (c && alcanceIncluye(await getAlcance(usuario), c.vendedorId)) {
      base = {
        clienteId: c.clienteId,
        lineas: c.items.map((i) => ({ modeloId: i.modeloId, colorId: i.colorId, series: i.series })),
        descuento: Number(c.descuentoPorcentaje),
        notas: c.notas,
      };
    }
  }
  const clienteId = sp.cliente ?? base?.clienteId;
  const cliente = clienteId ? await db.cliente.findUnique({ where: { id: clienteId } }) : null;
  const clienteValido = cliente && (await puedeVerCliente(usuario, cliente)) ? cliente : null;
  const precios = clienteValido ? await contextoPrecios(clienteValido) : null;
  const oportunidades = clienteValido
    ? await db.oportunidad.findMany({
        where: { clienteId: clienteValido.id, etapa: { notIn: ["GANADO", "PERDIDO"] } },
        select: { id: true, titulo: true },
      })
    : [];

  return (
    <>
      <EncabezadoPagina titulo={base ? "Duplicar cotización" : "Nueva cotización"} descripcion="Precios por par sin IGV; el total incluye IGV" />
      <Cotizador
        key={clienteValido?.id ?? "sin-cliente"}
        rol={usuario.rol}
        clientes={clientes.map((c) => ({ id: c.id, nombre: c.nombreComercial || c.razonSocial }))}
        clienteId={clienteValido?.id ?? null}
        oportunidades={oportunidades}
        oportunidadId={sp.oportunidad ?? null}
        catalogo={catalogo}
        precios={precios}
        config={{
          igvPorcentaje: config.igvPorcentaje,
          pedidoMinimoSeries: config.pedidoMinimoSeries,
          pedidoMinimoMonto: config.pedidoMinimoMonto,
          pedidoMinimoCualquiera: config.pedidoMinimoCualquiera,
          descuentoMaxVendedor: config.descuentoMaxVendedor,
          descuentoMaxSupervisor: config.descuentoMaxSupervisor,
        }}
        inicial={base && base.clienteId === clienteValido?.id ? base : null}
      />
    </>
  );
}
