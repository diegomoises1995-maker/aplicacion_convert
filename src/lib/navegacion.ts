import { tienePermiso, type Permiso, type Rol } from "@/lib/permisos";

export type IconoNav = "inicio" | "equipo" | "auditoria" | "perfil";

export type ItemNav = {
  href: string;
  titulo: string;
  icono: IconoNav;
  permiso?: Permiso;
  movil?: boolean; // aparece en la barra inferior del celular
};

// Cada fase agrega sus módulos aquí.
const ITEMS: ItemNav[] = [
  { href: "/", titulo: "Inicio", icono: "inicio", movil: true },
  { href: "/equipo", titulo: "Equipo", icono: "equipo", permiso: "equipo.ver", movil: true },
  { href: "/auditoria", titulo: "Auditoría", icono: "auditoria", permiso: "auditoria.ver" },
  { href: "/perfil", titulo: "Mi perfil", icono: "perfil", movil: true },
];

export function menuPara(rol: Rol): ItemNav[] {
  return ITEMS.filter((i) => !i.permiso || tienePermiso(rol, i.permiso));
}
