import { describe, expect, it } from "vitest";
import { clasificarAgenda } from "@/lib/actividades";
import { resumenPipeline, validarCambioEtapa } from "@/lib/pipeline";
import { aplicarPlantilla } from "@/lib/whatsapp";
import { hoyLima, rangoMes, desdeInputFecha, partesLima } from "@/lib/fechas";

describe("agenda", () => {
  it("separa vencidas, hoy y próximas; ignora completadas", () => {
    const inicio = new Date("2026-09-26T05:00:00Z");
    const fin = new Date("2026-09-27T05:00:00Z");
    const a = (iso: string, completada = false) => ({ fechaProgramada: new Date(iso), completada });
    const r = clasificarAgenda(
      [a("2026-09-25T15:00:00Z"), a("2026-09-26T20:00:00Z"), a("2026-09-26T14:00:00Z"), a("2026-09-28T15:00:00Z"), a("2026-09-20T15:00:00Z", true)],
      inicio,
      fin,
    );
    expect(r.vencidas).toHaveLength(1);
    expect(r.hoy.map((x) => x.fechaProgramada.toISOString())).toEqual(["2026-09-26T14:00:00.000Z", "2026-09-26T20:00:00.000Z"]);
    expect(r.proximas).toHaveLength(1);
  });
});

describe("pipeline", () => {
  it("exige motivo al perder", () => {
    expect(validarCambioEtapa("PERDIDO", "")).toMatch(/motivo/);
    expect(validarCambioEtapa("PERDIDO", "Precio")).toBeNull();
    expect(validarCambioEtapa("NEGOCIACION")).toBeNull();
  });
  it("calcula totales, ponderado y conversión", () => {
    const r = resumenPipeline([
      { etapa: "PROSPECTO", valorEstimado: 1000 },
      { etapa: "NEGOCIACION", valorEstimado: 2000 },
      { etapa: "GANADO", valorEstimado: 3000 },
      { etapa: "PERDIDO", valorEstimado: 500 },
    ]);
    expect(r.ponderado).toBe(100 + 1500);
    expect(r.abiertas).toBe(2);
    expect(r.conversion).toBe(0.5);
    expect(r.porEtapa.GANADO.valor).toBe(3000);
  });
});

describe("plantillas de WhatsApp", () => {
  it("reemplaza variables y elimina las desconocidas", () => {
    expect(aplicarPlantilla("Hola {contacto}, soy {vendedor} de {empresa}.{x}", { contacto: "Ana", vendedor: "Luis", empresa: "Convert" }))
      .toBe("Hola Ana, soy Luis de Convert.");
  });
});

describe("fechas en hora de Lima", () => {
  it("el día en Lima empieza a las 05:00 UTC", () => {
    expect(hoyLima(new Date("2026-09-27T03:00:00Z")).inicio.toISOString()).toBe("2026-09-26T05:00:00.000Z");
  });
  it("rango de mes y diciembre", () => {
    expect(rangoMes(2026, 12).fin.toISOString()).toBe("2027-01-01T05:00:00.000Z");
  });
  it("interpreta fechas de formulario como hora de Lima", () => {
    expect(desdeInputFecha("2026-09-26T09:30")!.toISOString()).toBe("2026-09-26T14:30:00.000Z");
    expect(partesLima(desdeInputFecha("2026-01-31")!)).toEqual({ anio: 2026, mes: 1, dia: 31 });
    expect(desdeInputFecha("basura")).toBeNull();
  });
});

import { formatFecha, formatSoles, formatNumero } from "@/lib/format";
describe("formato", () => {
  it("soles y números", () => {
    expect(formatSoles(1234567.5)).toBe("S/ 1,234,567.50");
    expect(formatSoles(-50)).toBe("-S/ 50.00");
    expect(formatNumero(1500)).toBe("1,500");
    expect(formatSoles(null)).toBe("—");
  });
  it("fechas en hora de Lima", () => {
    expect(formatFecha(new Date("2026-09-27T03:30:00Z"))).toBe("26 sep 2026");
    expect(formatFecha(new Date("2026-09-26T19:05:00Z"), true)).toBe("26 sep 2026, 14:05");
  });
});
