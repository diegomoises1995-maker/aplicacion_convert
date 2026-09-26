import { LogOut } from "lucide-react";
import { requireUsuario } from "@/server/sesion";
import { cerrarSesion } from "@/server/acciones/auth";
import { menuPara } from "@/lib/navegacion";
import { NOMBRE_ROL } from "@/lib/permisos";
import { iniciales } from "@/lib/format";
import { Logo } from "@/components/marca/logo";
import { NavInferior, NavLateral } from "@/components/layout/navegacion";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const usuario = await requireUsuario();
  const items = menuPara(usuario.rol);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      {/* Barra lateral (tablet/escritorio) */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-borde bg-superficie p-4 md:flex">
        <Logo className="mb-6 px-2" />
        <NavLateral items={items} />
        <div className="mt-auto border-t border-borde pt-4">
          <div className="flex items-center gap-3 px-2">
            <span className="grid size-9 place-items-center rounded-full bg-marca-100 text-sm font-semibold text-marca-700">
              {iniciales(usuario.nombre)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{usuario.nombre}</p>
              <p className="truncate text-xs text-texto-suave">{NOMBRE_ROL[usuario.rol]}</p>
            </div>
          </div>
          <form action={cerrarSesion} className="mt-3">
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-texto-suave hover:bg-fondo hover:text-texto">
              <LogOut className="size-5" aria-hidden /> Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Barra superior (celular) */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-borde bg-superficie/95 px-4 backdrop-blur md:hidden">
          <Logo />
          <span className="grid size-8 place-items-center rounded-full bg-marca-100 text-xs font-semibold text-marca-700">
            {iniciales(usuario.nombre)}
          </span>
        </header>
        <main className="pb-safe mx-auto max-w-6xl px-4 pt-5 md:px-8 md:pt-8">{children}</main>
      </div>

      <NavInferior items={items} />
    </div>
  );
}
