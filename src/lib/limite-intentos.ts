// Límite de intentos de ingreso en memoria (por instancia del servidor).
// Frena ataques de fuerza bruta básicos; para varias instancias usar Redis/Upstash.
const VENTANA_MS = 15 * 60 * 1000;
const MAX_INTENTOS = 5;
const intentos = new Map<string, { n: number; hasta: number }>();

export function bloqueado(clave: string, ahora = Date.now()) {
  const r = intentos.get(clave);
  return !!r && r.hasta > ahora && r.n >= MAX_INTENTOS;
}

export function registrarFallo(clave: string, ahora = Date.now()) {
  const r = intentos.get(clave);
  if (!r || r.hasta <= ahora) intentos.set(clave, { n: 1, hasta: ahora + VENTANA_MS });
  else r.n++;
}

export function limpiarIntentos(clave: string) {
  intentos.delete(clave);
}
