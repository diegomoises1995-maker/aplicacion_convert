import { describe, expect, it } from "vitest";
import { completarRuc, validarRuc } from "@/lib/ruc";
import {
  calcularCategoria,
  calcularEstadoCliente,
  calcularFrecuenciaDias,
  necesitaRecompra,
  numeroWhatsApp,
} from "@/lib/clientes";

const reglas = { diasClienteNuevo: 90, factorEnRiesgo: 1.5, diasClienteInactivo: 180, frecuenciaDefectoDias: 30 };
const hace = (dias: number, ahora = new Date("2026-09-26T15:00:00Z")) =>
  new Date(ahora.getTime() - dias * 86_400_000);
const AHORA = new Date("2026-09-26T15:00:00Z");

describe("validarRuc", () => {
  it("acepta un RUC real con dígito verificador correcto", () => {
    expect(validarRuc("20131312955")).toEqual({ valido: true, ruc: "20131312955" });
  });
  it("ignora espacios y guiones", () => {
    expect(validarRuc(" 20131312955 ").valido).toBe(true);
    expect(validarRuc("20-131312955").valido).toBe(true);
  });
  it("rechaza longitud, prefijo y dígito verificador inválidos", () => {
    expect(validarRuc("2013131295")).toMatchObject({ valido: false, error: expect.stringMatching(/11 dígitos/) });
    expect(validarRuc("30131312955")).toMatchObject({ valido: false, error: expect.stringMatching(/empezar/) });
    expect(validarRuc("20131312956")).toMatchObject({ valido: false, error: expect.stringMatching(/verificador/) });
  });
  it("completarRuc genera RUC válidos", () => {
    for (const base of ["2060000001", "1045678912", "2010007097"]) {
      expect(validarRuc(completarRuc(base)).valido).toBe(true);
    }
  });
});

describe("estado del cliente", () => {
  it("sin compras es prospecto", () => {
    expect(calcularEstadoCliente({ primeraCompra: null, ultimaCompra: null, frecuenciaDias: null }, reglas, AHORA)).toBe("PROSPECTO");
  });
  it("primera compra reciente es nuevo", () => {
    expect(calcularEstadoCliente({ primeraCompra: hace(20), ultimaCompra: hace(20), frecuenciaDias: null }, reglas, AHORA)).toBe("NUEVO");
  });
  it("compra dentro de su frecuencia es activo", () => {
    expect(calcularEstadoCliente({ primeraCompra: hace(300), ultimaCompra: hace(25), frecuenciaDias: 30 }, reglas, AHORA)).toBe("ACTIVO");
  });
  it("compra cada 30 días y lleva 46 sin comprar: en riesgo", () => {
    expect(calcularEstadoCliente({ primeraCompra: hace(300), ultimaCompra: hace(46), frecuenciaDias: 30 }, reglas, AHORA)).toBe("EN_RIESGO");
  });
  it("más de 180 días sin comprar es inactivo", () => {
    expect(calcularEstadoCliente({ primeraCompra: hace(400), ultimaCompra: hace(200), frecuenciaDias: 30 }, reglas, AHORA)).toBe("INACTIVO");
  });
  it("un cliente nuevo que deja de comprar pasa a en riesgo", () => {
    expect(calcularEstadoCliente({ primeraCompra: hace(60), ultimaCompra: hace(60), frecuenciaDias: null }, reglas, AHORA)).toBe("EN_RIESGO");
  });
});

describe("frecuencia, categoría, recompra y WhatsApp", () => {
  it("frecuencia promedio entre compras", () => {
    expect(calcularFrecuenciaDias([hace(90), hace(60), hace(30), hace(0)])).toBe(30);
    expect(calcularFrecuenciaDias([hace(10)])).toBeNull();
  });
  it("categoría por umbrales", () => {
    expect(calcularCategoria(35000, 30000, 10000)).toBe("A");
    expect(calcularCategoria(10000, 30000, 10000)).toBe("B");
    expect(calcularCategoria(9999, 30000, 10000)).toBe("C");
  });
  it("alerta de recompra cuando supera su frecuencia", () => {
    expect(necesitaRecompra({ primeraCompra: hace(200), ultimaCompra: hace(45), frecuenciaDias: 30 }, reglas, AHORA)).toEqual({ diasSinCompra: 45, frecuenciaDias: 30 });
    expect(necesitaRecompra({ primeraCompra: hace(200), ultimaCompra: hace(10), frecuenciaDias: 30 }, reglas, AHORA)).toBeNull();
  });
  it("normaliza celulares peruanos", () => {
    expect(numeroWhatsApp("987 654 321")).toBe("51987654321");
    expect(numeroWhatsApp("+51 987-654-321")).toBe("51987654321");
    expect(numeroWhatsApp("12345")).toBeNull();
  });
});
