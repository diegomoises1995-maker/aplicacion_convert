import { describe, expect, it } from "vitest";
import { aprobacionRequerida, calcularTotales, descuentoPorVolumen, precioPorPar, puedeAprobar, validarPedidoMinimo } from "@/lib/precios";
import { faltantes, necesidadPorVariante, seriesDisponibles } from "@/lib/stock";
import { puedeTransicionar, transicionesPosibles } from "@/lib/pedidos";

const limites = { descuentoMaxVendedor: 5, descuentoMaxSupervisor: 10 };

describe("precios", () => {
  it("precio por par: lista específica > ajuste de lista > base", () => {
    expect(precioPorPar({ precioBase: 100, precioLista: 90 }, -5)).toBe(90);
    expect(precioPorPar({ precioBase: 100 }, -5)).toBe(95);
    expect(precioPorPar({ precioBase: 100 })).toBe(100);
  });

  it("toma la mayor escala alcanzada", () => {
    const escalas = [{ desdeSeries: 5, descuentoPorcentaje: 3 }, { desdeSeries: 10, descuentoPorcentaje: 5 }];
    expect(descuentoPorVolumen(4, escalas)).toBe(0);
    expect(descuentoPorVolumen(7, escalas)).toBe(3);
    expect(descuentoPorVolumen(12, escalas)).toBe(5);
  });

  it("calcula totales con volumen, descuento manual e IGV 18 %", () => {
    const r = calcularTotales({
      lineas: [
        { modeloId: "m1", colorId: "c1", series: 3, paresPorSerie: 12, precioBase: 80 }, // 36 pares × 80 = 2880
        { modeloId: "m2", colorId: "c1", series: 2, paresPorSerie: 12, precioBase: 100 }, // 24 × 100 = 2400
      ],
      escalas: [{ desdeSeries: 5, descuentoPorcentaje: 5 }],
      descuentoManual: 2,
      igvPorcentaje: 18,
    });
    expect(r.subtotal).toBe(5280);
    expect(r.totalSeries).toBe(5);
    expect(r.totalPares).toBe(60);
    expect(r.descuentoVolumen).toBe(264); // 5 %
    expect(r.descuentoManualMonto).toBe(100.32); // 2 % de 5016
    expect(r.baseImponible).toBe(4915.68);
    expect(r.igv).toBe(884.82);
    expect(r.total).toBe(5800.5);
  });

  it("pedido mínimo: cualquiera de los dos o ambos", () => {
    const r = { pedidoMinimoSeries: 2, pedidoMinimoMonto: 1000, pedidoMinimoCualquiera: true };
    expect(validarPedidoMinimo(2, 500, r)).toBeNull();
    expect(validarPedidoMinimo(1, 1200, r)).toBeNull();
    expect(validarPedidoMinimo(1, 500, r)).toMatch(/2 series o/);
    expect(validarPedidoMinimo(2, 500, { ...r, pedidoMinimoCualquiera: false })).toMatch(/y S\//);
  });

  it("aprobación de descuentos por rol", () => {
    expect(aprobacionRequerida("VENDEDOR", 5, limites)).toBeNull();
    expect(aprobacionRequerida("VENDEDOR", 8, limites)).toBe("SUPERVISOR");
    expect(aprobacionRequerida("VENDEDOR", 12, limites)).toBe("ADMIN");
    expect(aprobacionRequerida("SUPERVISOR", 10, limites)).toBeNull();
    expect(aprobacionRequerida("SUPERVISOR", 15, limites)).toBe("ADMIN");
    expect(aprobacionRequerida("ADMIN", 40, limites)).toBeNull();
    expect(puedeAprobar("SUPERVISOR", 8, limites)).toBe(true);
    expect(puedeAprobar("SUPERVISOR", 12, limites)).toBe(false);
    expect(puedeAprobar("VENDEDOR", 1, limites)).toBe(false);
  });
});

describe("stock por talla", () => {
  const curva = { "38": 1, "39": 2, "40": 3, "41": 3, "42": 2, "43": 1 };
  it("series disponibles según la talla más escasa", () => {
    expect(seriesDisponibles(curva, { "38": 10, "39": 20, "40": 30, "41": 7, "42": 20, "43": 10 })).toBe(2);
    expect(seriesDisponibles(curva, {})).toBe(0);
  });
  it("necesidad y faltantes por variante", () => {
    const req = necesidadPorVariante([
      { modeloId: "m", colorId: "c", series: 2, distribucion: curva },
      { modeloId: "m", colorId: "c", series: 1, distribucion: curva },
    ]);
    expect(req.get("m|c|40")).toBe(9);
    const stock = new Map([...req].map(([k, v]) => [k, v]));
    stock.set("m|c|41", 5);
    expect(faltantes(req, stock)).toEqual([{ clave: "m|c|41", necesario: 9, disponible: 5 }]);
  });
});

describe("estados del pedido", () => {
  it("solo permite el flujo definido", () => {
    expect(puedeTransicionar("PENDIENTE_PAGO", "PAGO_VERIFICADO")).toBe(true);
    expect(puedeTransicionar("PENDIENTE_PAGO", "ENVIADO")).toBe(false);
    expect(puedeTransicionar("ENVIADO", "CANCELADO")).toBe(false);
    expect(transicionesPosibles("ENTREGADO")).toEqual([]);
  });
});
