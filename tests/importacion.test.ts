import { describe, expect, it } from "vitest";
import { filasDesdeMatriz, mapearEncabezados, marcarDuplicadosInternos, validarFila } from "@/lib/importacion";

const ctx = {
  vendedores: [{ id: "v1", email: "carlos@convert.pe", nombre: "Carlos Huamán" }],
  zonas: [{ id: "z1", nombre: "Lima Norte" }],
  vendedorPorDefecto: null,
};

describe("importación de clientes", () => {
  it("reconoce encabezados con tildes, mayúsculas y sinónimos", () => {
    expect(mapearEncabezados(["RUC", "Razón Social", "Celular", "Correo", "Vendedor", "Región", "xyz"])).toEqual([
      "ruc", "razonSocial", "telefono", "email", "vendedor", "departamento", null,
    ]);
  });

  it("detecta columnas obligatorias faltantes e ignora filas vacías", () => {
    const { filas, faltantes } = filasDesdeMatriz([["RUC", "Ciudad"], ["20131312955", "Lima"], ["", ""]]);
    expect(faltantes).toEqual(["razonSocial"]);
    expect(filas).toHaveLength(1);
  });

  it("valida una fila correcta y resuelve vendedor y zona", () => {
    const f = validarFila({ ruc: "20131312955", razonSocial: "Calzados SAC", vendedor: "CARLOS@convert.pe", zona: "lima norte", tipo: "Revendedor", telefono: "987654321" }, 2, ctx);
    expect(f.errores).toEqual([]);
    expect(f.datos).toMatchObject({ vendedorId: "v1", zonaId: "z1", tipo: "REVENDEDOR", whatsapp: "987654321", ciudad: "Lima" });
  });

  it("reporta todos los errores de una fila", () => {
    const f = validarFila({ ruc: "123", vendedor: "otro@x.pe", zona: "Marte", categoria: "Z", email: "malo" }, 3, ctx);
    expect(f.errores).toHaveLength(6);
  });

  it("marca RUC repetidos dentro del archivo", () => {
    const filas = [2, 3].map((n) => validarFila({ ruc: "20131312955", razonSocial: "X SAC" }, n, ctx));
    marcarDuplicadosInternos(filas);
    expect(filas[0]!.errores).toEqual([]);
    expect(filas[1]!.errores[0]).toMatch(/repetido.*fila 2/);
  });
});
