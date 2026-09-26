import { describe, expect, it } from "vitest";
import { bloqueado, limpiarIntentos, registrarFallo } from "@/lib/limite-intentos";

describe("límite de intentos de ingreso", () => {
  it("bloquea tras 5 fallos y se libera al pasar la ventana o al acertar", () => {
    const t = 1_000_000;
    for (let i = 0; i < 4; i++) registrarFallo("a@x.pe", t);
    expect(bloqueado("a@x.pe", t)).toBe(false);
    registrarFallo("a@x.pe", t);
    expect(bloqueado("a@x.pe", t)).toBe(true);
    expect(bloqueado("a@x.pe", t + 16 * 60 * 1000)).toBe(false);
    limpiarIntentos("a@x.pe");
    expect(bloqueado("a@x.pe", t)).toBe(false);
  });
});
