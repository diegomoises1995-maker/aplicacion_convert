"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ShieldCheck, UserRound, Users, type LucideIcon } from "lucide-react";
import type { IconoNav, ItemNav } from "@/lib/navegacion";
import { cn } from "@/lib/utils";

const ICONOS: Record<IconoNav, LucideIcon> = {
  inicio: House,
  equipo: Users,
  auditoria: ShieldCheck,
  perfil: UserRound,
};

function activo(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

export function NavLateral({ items }: { items: ItemNav[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icono = ICONOS[item.icono];
        const esActivo = activo(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={esActivo ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              esActivo ? "bg-marca-50 text-marca-700" : "text-texto-suave hover:bg-fondo hover:text-texto",
            )}
          >
            <Icono className="size-5" aria-hidden />
            {item.titulo}
          </Link>
        );
      })}
    </nav>
  );
}

export function NavInferior({ items }: { items: ItemNav[] }) {
  const pathname = usePathname();
  const moviles = items.filter((i) => i.movil).slice(0, 5);
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-borde bg-superficie/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${moviles.length}, minmax(0, 1fr))` }}>
        {moviles.map((item) => {
          const Icono = ICONOS[item.icono];
          const esActivo = activo(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={esActivo ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  esActivo ? "text-marca-700" : "text-texto-suave",
                )}
              >
                <Icono className="size-6" aria-hidden />
                {item.titulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
