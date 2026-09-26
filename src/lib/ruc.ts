// Validación de RUC peruano (SUNAT): 11 dígitos, prefijo válido y dígito verificador.

const PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
// 10: persona natural · 15/16/17: casos especiales · 20: persona jurídica
const PREFIJOS = ["10", "15", "16", "17", "20"];

export function digitoVerificadorRuc(primeros10: string): number {
  const suma = PESOS.reduce((acc, peso, i) => acc + peso * Number(primeros10[i]), 0);
  const dv = 11 - (suma % 11);
  return dv === 10 ? 0 : dv === 11 ? 1 : dv;
}

export function normalizarRuc(valor: string): string {
  return valor.replace(/\D/g, "");
}

export type ResultadoRuc = { valido: true; ruc: string } | { valido: false; error: string };

export function validarRuc(valor: string): ResultadoRuc {
  const ruc = normalizarRuc(valor ?? "");
  if (ruc.length !== 11) return { valido: false, error: "El RUC debe tener 11 dígitos" };
  if (!PREFIJOS.includes(ruc.slice(0, 2))) {
    return { valido: false, error: "El RUC debe empezar con 10, 15, 16, 17 o 20" };
  }
  if (digitoVerificadorRuc(ruc) !== Number(ruc[10])) {
    return { valido: false, error: "El RUC no es válido (dígito verificador incorrecto)" };
  }
  return { valido: true, ruc };
}

/** Genera un RUC válido a partir de 10 dígitos (útil para seed y pruebas). */
export function completarRuc(primeros10: string): string {
  return primeros10 + digitoVerificadorRuc(primeros10);
}
