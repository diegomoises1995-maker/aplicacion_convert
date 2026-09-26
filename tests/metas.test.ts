import { describe, expect, it } from "vitest";
import { cumplimiento, proyeccion, semaforo, variacion } from "@/lib/metas";
import { calcularComision, sinIgv, type Regla } from "@/lib/comisiones";

const u = { semaforoVerde: 90, semaforoAmarillo: 70 };

describe("metas", () => {
  it("cumplimiento y proyección", () => {
    expect(cumplimiento(50, 100)).toBe(0.5);
    expect(cumplimiento(50, 0)).toBeNull();
    expect(proyeccion(40, 0.5)).toBe(80);
    expect(variacion(120, 100)).toBeCloseTo(0.2);
    expect(variacion(10, 0)).toBeNull();
  });
  it("semáforo contra el avance esperado a la fecha", () => {
    // A mitad de mes con 48 % de la meta va en camino (96 % del ritmo esperado)
    expect(semaforo(48, 100, 0.5, u)).toBe("verde");
    expect(semaforo(40, 100, 0.5, u)).toBe("amarillo");
    expect(semaforo(30, 100, 0.5, u)).toBe("rojo");
    // Mes cerrado: se compara contra el 100 %
    expect(semaforo(95, 100, 1, u)).toBe("verde");
    expect(semaforo(60, 100, 1, u)).toBe("rojo");
    expect(semaforo(10, null, 0.5, u)).toBe("sin_meta");
  });
});

describe("comisiones", () => {
  const reglas: Regla[] = [
    { id: "1", nombre: "Comisión 3 %", tipo: "PORCENTAJE_VENTA_COBRADA", valor: 3, umbralCumplimiento: null },
    { id: "2", nombre: "Bono meta 100 %", tipo: "BONO_CUMPLIMIENTO_META", valor: 300, umbralCumplimiento: 100 },
    { id: "3", nombre: "Bono meta 120 %", tipo: "BONO_CUMPLIMIENTO_META", valor: 500, umbralCumplimiento: 120 },
    { id: "4", nombre: "Cliente nuevo", tipo: "BONO_CLIENTE_NUEVO", valor: 50, umbralCumplimiento: null },
  ];
  it("suma % de venta cobrada, el tramo de meta más alto y bonos por cliente", () => {
    const r = calcularComision({ ventaCobrada: 40000, cumplimientoSoles: 1.25, clientesNuevos: 2, clientesReactivados: 1 }, reglas);
    expect(r.comisionVenta).toBe(1200);
    expect(r.bonos).toBe(500 + 100);
    expect(r.total).toBe(1800);
    expect(r.lineas.map((l) => l.regla)).toEqual(["Comisión 3 %", "Bono meta 120 %", "Cliente nuevo"]);
  });
  it("sin cumplir meta no hay bono", () => {
    const r = calcularComision({ ventaCobrada: 10000, cumplimientoSoles: 0.8, clientesNuevos: 0, clientesReactivados: 0 }, reglas);
    expect(r.total).toBe(300);
  });
  it("quita el IGV de lo cobrado", () => {
    expect(sinIgv(1180, 18)).toBe(1000);
  });
});
