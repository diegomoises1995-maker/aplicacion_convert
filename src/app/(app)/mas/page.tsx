import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, LogOut } from "lucide-react";
import { requireUsuario } from "@/server/sesion";
import { cerrarSesion } from "@/server/acciones/auth";
import { menuMas } from "@/lib/navegacion";
import { NOMBRE_ROL } from "@/lib/permisos";
import { Card, EncabezadoPagina } from "@/components/ui/card";
import { ICONOS } from "@/components/layout/iconos";

export const metadata: Metadata = { title: "Más" };

export default async function MasPage() {
  const usuario = await requireUsuario();
  return (
    <>
      <EncabezadoPagina titulo={usuario.nombre} descripcion={NOMBRE_ROL[usuario.rol]} />
      <Card className="p-0 md:p-0">
        <ul className="divide-y divide-borde">
          {menuMas(usuario.rol).map((i) => {
            const Icono = ICONOS[i.icono];
            return (
              <li key={i.href}>
                <Link href={i.href} className="flex items-center gap-3 px-4 py-3.5">
                  <Icono className="size-5 text-marca-700" aria-hidden />
                  <span className="flex-1 font-medium">{i.titulo}</span>
                  <ChevronRight className="size-4 text-texto-suave" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
      <form action={cerrarSesion} className="mt-4">
        <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-borde bg-superficie py-3 text-sm font-medium text-red-700">
          <LogOut className="size-4" aria-hidden /> Cerrar sesión
        </button>
      </form>
    </>
  );
}
