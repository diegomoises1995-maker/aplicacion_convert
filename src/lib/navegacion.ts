import { tienePermiso, type Permiso, type Rol } from "@/lib/permisos";

export type IconoNav =
  | "inicio" | "agenda" | "clientes" | "pipeline" | "cotizaciones" | "pedidos" | "catalogo" | "metas"
  | "comisiones" | "reportes" | "equipo" | "configuracion" | "auditoria" | "perfil" | "mas" | "aprobaciones";

export type ItemNav = {
  href: string;
  titulo: string;
  icono: IconoNav;
  permiso?: Permiso;
  movil?: boolean; // aparece en la barra inferior del celular
};

const ITEMS: ItemNav[] = [
  { href: "/", titulo: "Inicio", icono: "inicio", movil: true },
  { href: "/agenda", titulo: "Agenda", icono: "agenda", movil: true },
  { href: "/clientes", titulo: "Clientes", icono: "clientes", movil: true },
  { href: "/pipeline", titulo: "Pipeline", icono: "pipeline", movil: true },
  { href: "/cotizaciones", titulo: "Cotizaciones", icono: "cotizaciones" },
  { href: "/pedidos", titulo: "Pedidos", icono: "pedidos" },
  { href: "/catalogo", titulo: "Catálogo", icono: "catalogo" },
  { href: "/aprobaciones", titulo: "Aprobaciones", icono: "aprobaciones", permiso: "descuentos.aprobar" },
  { href: "/equipo", titulo: "Equipo", icono: "equipo", permiso: "equipo.ver" },
  { href: "/configuracion", titulo: "Configuración", icono: "configuracion", permiso: "configuracion.editar" },
  { href: "/auditoria", titulo: "Auditoría", icono: "auditoria", permiso: "auditoria.ver" },
];

export function menuPara(rol: Rol): ItemNav[] {
  return ITEMS.filter((i) => !i.permiso || tienePermiso(rol, i.permiso));
}

/** Barra inferior del celular: accesos principales + «Más». */
export function menuMovil(rol: Rol): ItemNav[] {
  return [...menuPara(rol).filter((i) => i.movil), { href: "/mas", titulo: "Más", icono: "mas" }];
}

/** Lo que no cabe en la barra inferior (página «Más»). */
export function menuMas(rol: Rol): ItemNav[] {
  return [...menuPara(rol).filter((i) => !i.movil), { href: "/perfil", titulo: "Mi perfil", icono: "perfil" }];
}
