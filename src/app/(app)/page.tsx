import type { Metadata } from "next";
import { getAlcance, requireUsuario } from "@/server/sesion";
import { NOMBRE_ROL } from "@/lib/permisos";
import { EncabezadoPagina } from "@/components/ui/card";
import { formatFecha } from "@/lib/format";
import { DashboardGerencia } from "./dashboard-gerencia";
import { DashboardVendedor } from "./dashboard-vendedor";

export const metadata: Metadata = { title: "Inicio" };

export default async function InicioPage({ searchParams }: { searchParams: Promise<{ acceso?: string }> }) {
  const usuario = await requireUsuario();
  const { acceso } = await searchParams;
  const primerNombre = usuario.nombre.split(" ")[0];

  return (
    <>
      {acceso === "denegado" && (
        <p role="alert" className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No tienes permiso para acceder a esa sección.
        </p>
      )}
      <EncabezadoPagina titulo={`Hola, ${primerNombre}`} descripcion={`${NOMBRE_ROL[usuario.rol]} · ${formatFecha(new Date())}`} />
      {usuario.rol === "VENDEDOR" ? (
        <DashboardVendedor usuario={usuario} />
      ) : (
        <DashboardGerencia usuario={usuario} alcance={await getAlcance(usuario)} />
      )}
    </>
  );
}
