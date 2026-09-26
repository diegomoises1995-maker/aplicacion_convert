// Matriz de permisos por rol. Módulo puro (sin Prisma) para poder usarlo
// también en el middleware (runtime edge) y en pruebas unitarias.

export type Rol = "ADMIN" | "SUPERVISOR" | "VENDEDOR";

export const ROLES: Rol[] = ["ADMIN", "SUPERVISOR", "VENDEDOR"];

export const NOMBRE_ROL: Record<Rol, string> = {
  ADMIN: "Gerente / Administrador",
  SUPERVISOR: "Supervisor",
  VENDEDOR: "Vendedor",
};

export type Permiso =
  | "equipo.ver"
  | "usuarios.gestionar" // alta/baja de usuarios, roles
  | "zonas.gestionar"
  | "clientes.reasignar"
  | "clientes.importar"
  | "metas.definir"
  | "comisiones.configurar"
  | "comisiones.liquidar"
  | "precios.gestionar"
  | "catalogo.gestionar"
  | "descuentos.aprobar"
  | "pagos.verificar"
  | "pedidos.gestionar" // preparación, envío, entrega y cancelación de pedidos pagados
  | "reportes.gerencia"
  | "configuracion.editar"
  | "auditoria.ver";

const PERMISOS: Record<Rol, readonly Permiso[]> = {
  ADMIN: [
    "equipo.ver",
    "usuarios.gestionar",
    "zonas.gestionar",
    "clientes.reasignar",
    "clientes.importar",
    "metas.definir",
    "comisiones.configurar",
    "comisiones.liquidar",
    "precios.gestionar",
    "catalogo.gestionar",
    "descuentos.aprobar",
    "pagos.verificar",
    "pedidos.gestionar",
    "reportes.gerencia",
    "configuracion.editar",
    "auditoria.ver",
  ],
  SUPERVISOR: [
    "equipo.ver",
    "clientes.reasignar", // solo dentro de su equipo (lo valida la capa de datos)
    "clientes.importar",
    "descuentos.aprobar",
    "reportes.gerencia", // acotado a su equipo
  ],
  VENDEDOR: [],
};

export function tienePermiso(rol: Rol, permiso: Permiso): boolean {
  return PERMISOS[rol].includes(permiso);
}

// Rutas que requieren un permiso concreto. El middleware las bloquea antes de
// renderizar; las páginas y acciones de servidor vuelven a validar.
// Las más específicas primero.
const RUTAS_PROTEGIDAS: { prefijo: string; permiso: Permiso }[] = [
  { prefijo: "/equipo/nuevo", permiso: "usuarios.gestionar" },
  { prefijo: "/equipo", permiso: "equipo.ver" },
  { prefijo: "/clientes/importar", permiso: "clientes.importar" },
  { prefijo: "/catalogo/nuevo", permiso: "catalogo.gestionar" },
  { prefijo: "/aprobaciones", permiso: "descuentos.aprobar" },
  { prefijo: "/metas/definir", permiso: "metas.definir" },
  { prefijo: "/reportes", permiso: "reportes.gerencia" },
  { prefijo: "/configuracion", permiso: "configuracion.editar" },
  { prefijo: "/auditoria", permiso: "auditoria.ver" },
];

export function puedeAccederRuta(rol: Rol, pathname: string): boolean {
  const regla = RUTAS_PROTEGIDAS.find(
    (r) => pathname === r.prefijo || pathname.startsWith(r.prefijo + "/"),
  );
  return regla ? tienePermiso(rol, regla.permiso) : true;
}
