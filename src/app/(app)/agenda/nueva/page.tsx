import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUsuario } from "@/server/sesion";
import { filtroClientes, vendedoresAsignables } from "@/server/clientes";
import { aInputFechaHora } from "@/lib/fechas";
import { Card, EncabezadoPagina } from "@/components/ui/card";
import { FormularioActividad } from "@/components/seguimiento/formulario-actividad";

export const metadata: Metadata = { title: "Nueva actividad" };

export default async function NuevaActividadPage({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const usuario = await requireUsuario();
  const { cliente } = await searchParams;
  const [clientes, vendedores] = await Promise.all([
    db.cliente.findMany({
      where: await filtroClientes(usuario),
      select: { id: true, razonSocial: true, nombreComercial: true },
      orderBy: { razonSocial: "asc" },
    }),
    usuario.rol === "VENDEDOR" ? [] : vendedoresAsignables(usuario),
  ]);
  return (
    <>
      <EncabezadoPagina titulo="Nueva actividad" descripcion="Llamada, WhatsApp, visita, reunión o tarea" />
      <Card>
        <FormularioActividad
          ahora={aInputFechaHora(new Date())}
          clientes={clientes.map((c) => ({ id: c.id, nombre: c.nombreComercial || c.razonSocial }))}
          vendedores={vendedores.filter((v) => v.id !== usuario.id)}
          clienteInicial={cliente}
        />
      </Card>
    </>
  );
}
