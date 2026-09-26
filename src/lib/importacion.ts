// Importación masiva de clientes: normaliza encabezados flexibles y valida cada fila.
import { validarRuc } from "@/lib/ruc";

export type CampoCliente =
  | "ruc" | "razonSocial" | "nombreComercial" | "contactoNombre" | "telefono" | "whatsapp"
  | "email" | "direccion" | "distrito" | "ciudad" | "departamento" | "tipo" | "categoria"
  | "vendedor" | "zona" | "notas";

const ALIAS: Record<CampoCliente, string[]> = {
  ruc: ["ruc", "nruc", "numeroruc", "nroruc"],
  razonSocial: ["razonsocial", "nombre", "cliente", "empresa", "denominacion"],
  nombreComercial: ["nombrecomercial", "comercial", "tienda"],
  contactoNombre: ["contacto", "nombrecontacto", "contactonombre", "encargado"],
  telefono: ["telefono", "tel", "fono", "celular"],
  whatsapp: ["whatsapp", "wsp", "wasap", "whatsap"],
  email: ["email", "correo", "mail", "correoelectronico"],
  direccion: ["direccion", "domicilio"],
  distrito: ["distrito"],
  ciudad: ["ciudad", "provincia", "localidad"],
  departamento: ["departamento", "region"],
  tipo: ["tipo", "tipocliente"],
  categoria: ["categoria", "clasificacion"],
  vendedor: ["vendedor", "emailvendedor", "correovendedor", "vendedoremail", "asesor"],
  zona: ["zona", "territorio"],
  notas: ["notas", "observaciones", "comentarios"],
};

export const ENCABEZADOS_PLANTILLA: CampoCliente[] = [
  "ruc", "razonSocial", "nombreComercial", "contactoNombre", "telefono", "whatsapp", "email",
  "direccion", "distrito", "ciudad", "departamento", "tipo", "categoria", "vendedor", "zona", "notas",
];

export function normalizarEncabezado(h: string) {
  return h.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Devuelve, por cada columna del archivo, el campo al que corresponde (o null). */
export function mapearEncabezados(encabezados: string[]): (CampoCliente | null)[] {
  const usados = new Set<CampoCliente>();
  return encabezados.map((h) => {
    const n = normalizarEncabezado(h);
    const campo = (Object.keys(ALIAS) as CampoCliente[]).find((c) => !usados.has(c) && (ALIAS[c].includes(n) || normalizarEncabezado(c) === n));
    if (campo) usados.add(campo);
    return campo ?? null;
  });
}

export type FilaCruda = Partial<Record<CampoCliente, string>>;

export function filasDesdeMatriz(matriz: string[][]): { filas: FilaCruda[]; faltantes: CampoCliente[] } {
  const [encabezados = [], ...resto] = matriz;
  const mapa = mapearEncabezados(encabezados);
  const faltantes = (["ruc", "razonSocial"] as CampoCliente[]).filter((c) => !mapa.includes(c));
  const filas = resto
    .filter((f) => f.some((v) => String(v ?? "").trim() !== ""))
    .map((f) => {
      const fila: FilaCruda = {};
      mapa.forEach((campo, i) => {
        const v = String(f[i] ?? "").trim();
        if (campo && v) fila[campo] = v;
      });
      return fila;
    });
  return { filas, faltantes };
}

export type ContextoValidacion = {
  vendedores: { id: string; email: string; nombre: string }[]; // vendedores asignables por quien importa
  zonas: { id: string; nombre: string }[];
  vendedorPorDefecto: string | null;
};

export type TipoCliente = "TIENDA" | "REVENDEDOR" | "DISTRIBUIDOR" | "OTRO";

export type FilaValidada = {
  numero: number; // fila en el archivo (1 = encabezado)
  errores: string[];
  datos: {
    ruc: string;
    razonSocial: string;
    nombreComercial?: string;
    contactoNombre?: string;
    telefono?: string;
    whatsapp?: string;
    email?: string;
    direccion?: string;
    distrito?: string;
    ciudad: string;
    departamento?: string;
    tipo: TipoCliente;
    categoria?: "A" | "B" | "C";
    vendedorId: string | null;
    zonaId: string | null;
    notas?: string;
  };
};

const TIPOS: Record<string, TipoCliente> = {
  tienda: "TIENDA", revendedor: "REVENDEDOR", revendedora: "REVENDEDOR", distribuidor: "DISTRIBUIDOR",
  distribuidora: "DISTRIBUIDOR", mayorista: "DISTRIBUIDOR", otro: "OTRO",
};

export function validarFila(fila: FilaCruda, numero: number, ctx: ContextoValidacion): FilaValidada {
  const errores: string[] = [];
  const ruc = validarRuc(fila.ruc ?? "");
  if (!ruc.valido) errores.push(ruc.error);
  if (!fila.razonSocial || fila.razonSocial.length < 2) errores.push("Falta la razón social");
  if (fila.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fila.email)) errores.push("Correo inválido");

  let tipo: TipoCliente = "TIENDA";
  if (fila.tipo) {
    const t = TIPOS[normalizarEncabezado(fila.tipo)];
    if (t) tipo = t;
    else errores.push(`Tipo "${fila.tipo}" no reconocido (tienda, revendedor, distribuidor, otro)`);
  }

  let categoria: "A" | "B" | "C" | undefined;
  if (fila.categoria) {
    const c = fila.categoria.trim().toUpperCase();
    if (c === "A" || c === "B" || c === "C") categoria = c;
    else errores.push("La categoría debe ser A, B o C");
  }

  let vendedorId = ctx.vendedorPorDefecto;
  if (fila.vendedor) {
    const v = fila.vendedor.trim().toLowerCase();
    const encontrado = ctx.vendedores.find((x) => x.email.toLowerCase() === v || x.nombre.toLowerCase() === v);
    if (encontrado) vendedorId = encontrado.id;
    else errores.push(`Vendedor "${fila.vendedor}" no encontrado o fuera de tu equipo`);
  }

  let zonaId: string | null = null;
  if (fila.zona) {
    const z = ctx.zonas.find((x) => normalizarEncabezado(x.nombre) === normalizarEncabezado(fila.zona!));
    if (z) zonaId = z.id;
    else errores.push(`Zona "${fila.zona}" no existe`);
  }

  return {
    numero,
    errores,
    datos: {
      ruc: ruc.valido ? ruc.ruc : (fila.ruc ?? ""),
      razonSocial: fila.razonSocial ?? "",
      nombreComercial: fila.nombreComercial,
      contactoNombre: fila.contactoNombre,
      telefono: fila.telefono,
      whatsapp: fila.whatsapp ?? fila.telefono,
      email: fila.email?.toLowerCase(),
      direccion: fila.direccion,
      distrito: fila.distrito,
      ciudad: fila.ciudad ?? "Lima",
      departamento: fila.departamento,
      tipo,
      categoria,
      vendedorId,
      zonaId,
      notas: fila.notas,
    },
  };
}

/** Marca como error los RUC repetidos dentro del mismo archivo. */
export function marcarDuplicadosInternos(filas: FilaValidada[]) {
  const vistos = new Map<string, number>();
  for (const f of filas) {
    const previo = vistos.get(f.datos.ruc);
    if (previo !== undefined) f.errores.push(`RUC repetido en el archivo (fila ${previo})`);
    else vistos.set(f.datos.ruc, f.numero);
  }
  return filas;
}
