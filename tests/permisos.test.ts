import { describe, expect, it } from "vitest";
import { puedeAccederRuta, tienePermiso } from "@/lib/permisos";
import { alcanceIncluye, calcularAlcance, filtroEquipo, filtroVendedor } from "@/lib/alcance";
import { menuPara } from "@/lib/navegacion";

describe("permisos por rol", () => {
  it("el administrador tiene todos los permisos de gestión", () => {
    expect(tienePermiso("ADMIN", "metas.definir")).toBe(true);
    expect(tienePermiso("ADMIN", "auditoria.ver")).toBe(true);
    expect(tienePermiso("ADMIN", "precios.gestionar")).toBe(true);
  });

  it("el supervisor aprueba descuentos pero no define metas, precios ni ve auditoría", () => {
    expect(tienePermiso("SUPERVISOR", "descuentos.aprobar")).toBe(true);
    expect(tienePermiso("SUPERVISOR", "metas.definir")).toBe(false);
    expect(tienePermiso("SUPERVISOR", "precios.gestionar")).toBe(false);
    expect(tienePermiso("SUPERVISOR", "auditoria.ver")).toBe(false);
  });

  it("el vendedor no tiene permisos de gestión", () => {
    expect(tienePermiso("VENDEDOR", "equipo.ver")).toBe(false);
    expect(tienePermiso("VENDEDOR", "descuentos.aprobar")).toBe(false);
    expect(tienePermiso("VENDEDOR", "clientes.reasignar")).toBe(false);
  });

  it("bloquea rutas según rol, incluidas subrutas", () => {
    expect(puedeAccederRuta("VENDEDOR", "/equipo")).toBe(false);
    expect(puedeAccederRuta("VENDEDOR", "/equipo/123")).toBe(false);
    expect(puedeAccederRuta("SUPERVISOR", "/equipo")).toBe(true);
    expect(puedeAccederRuta("SUPERVISOR", "/auditoria")).toBe(false);
    expect(puedeAccederRuta("ADMIN", "/auditoria")).toBe(true);
    expect(puedeAccederRuta("VENDEDOR", "/")).toBe(true);
    // Un prefijo parecido no debe confundirse con la ruta protegida
    expect(puedeAccederRuta("VENDEDOR", "/equipos-publicos")).toBe(true);
  });

  it("el menú solo muestra lo permitido", () => {
    const hrefs = (rol: Parameters<typeof menuPara>[0]) => menuPara(rol).map((i) => i.href);
    expect(hrefs("VENDEDOR")).not.toContain("/equipo");
    expect(hrefs("SUPERVISOR")).toContain("/equipo");
    expect(hrefs("SUPERVISOR")).not.toContain("/auditoria");
    expect(hrefs("ADMIN")).toContain("/auditoria");
  });
});

describe("alcance de datos", () => {
  it("el vendedor solo se ve a sí mismo", () => {
    const a = calcularAlcance("VENDEDOR", "v1", []);
    expect(alcanceIncluye(a, "v1")).toBe(true);
    expect(alcanceIncluye(a, "v2")).toBe(false);
    expect(filtroVendedor(a)).toEqual({ vendedorId: { in: ["v1"] } });
  });

  it("el supervisor ve a su equipo y a sí mismo, no a otros equipos", () => {
    const a = calcularAlcance("SUPERVISOR", "s1", ["v1", "v2"]);
    expect(alcanceIncluye(a, "s1")).toBe(true);
    expect(alcanceIncluye(a, "v2")).toBe(true);
    expect(alcanceIncluye(a, "v9")).toBe(false);
    expect(filtroEquipo(a)).toEqual({ id: { in: ["s1", "v1", "v2"] } });
  });

  it("el administrador ve todo, sin filtro", () => {
    const a = calcularAlcance("ADMIN", "a1", []);
    expect(alcanceIncluye(a, "cualquiera")).toBe(true);
    expect(filtroVendedor(a)).toEqual({});
  });

  it("un registro sin vendedor asignado solo lo ve el administrador", () => {
    expect(alcanceIncluye(calcularAlcance("SUPERVISOR", "s1", ["v1"]), null)).toBe(false);
    expect(alcanceIncluye(calcularAlcance("ADMIN", "a1", []), null)).toBe(true);
  });
});
