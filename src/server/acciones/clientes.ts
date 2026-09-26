"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { validarRuc } from "@/lib/ruc";
import { datosForm, erroresDeZod, type EstadoForm } from "@/lib/form";
import { tienePermiso } from "@/lib/permisos";
import { filasDesdeMatriz, marcarDuplicadosInternos, validarFila, type FilaValidada } from "@/lib/importacion";
import { requireUsuario, type UsuarioActual } from "@/server/sesion";
import { registrarAuditoria } from "@/server/auditoria";
import { puedeVerCliente, vendedoresAsignables } from "@/server/clientes";

const opcional = z.string().max(200).optional();

const clienteSchema = z.object({
  ruc: z.string().transform((v, ctx) => {
    const r = validarRuc(v);
    if (!r.valido) {
      ctx.addIssue({ code: "custom", message: r.error });
      return z.NEVER;
    }
    return r.ruc;
  }),
  razonSocial: z.string().min(2, "Ingresa la razón social").max(200),
  nombreComercial: opcional,
  tipo: z.enum(["TIENDA", "REVENDEDOR", "DISTRIBUIDOR", "OTRO"]),
  categoria: z.enum(["A", "B", "C"]).optional(),
  categoriaManual: z.string().optional().transform((v) => v === "on"),
  contactoNombre: opcional,
  telefono: z.string().regex(/^[\d +()-]{6,20}$/, "Teléfono inválido").optional(),
  whatsapp: z.string().regex(/^[\d +()-]{9,20}$/, "Número de WhatsApp inválido").optional(),
  email: z.string().email("Correo inválido").optional(),
  direccion: opcional,
  distrito: opcional,
  ciudad: z.string().min(2, "Ingresa la ciudad").max(100),
  departamento: opcional,
  zonaId: z.string().optional(),
  vendedorId: z.string().optional(),
  listaPrecioId: z.string().optional(),
  notas: z.string().max(2000).optional(),
});

async function validarVendedorAsignable(usuario: UsuarioActual, vendedorId: string | null) {
  if (vendedorId === null) return usuario.rol !== "VENDEDOR";
  const asignables = await vendedoresAsignables(usuario);
  return asignables.some((v) => v.id === vendedorId);
}

export async function guardarCliente(id: string | null, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const usuario = await requireUsuario();
  const parsed = clienteSchema.safeParse(datosForm(formData));
  if (!parsed.success) return { errores: erroresDeZod(parsed.error) };
  const { vendedorId: vendedorForm, categoria, categoriaManual, ...d } = parsed.data;

  const actual = id ? await db.cliente.findUnique({ where: { id } }) : null;
  if (id && (!actual || !(await puedeVerCliente(usuario, actual)))) return { error: "Cliente no encontrado." };

  // El vendedor siempre crea clientes a su nombre y no puede reasignarlos.
  let vendedorId: string | null;
  if (usuario.rol === "VENDEDOR") vendedorId = actual ? actual.vendedorId : usuario.id;
  else vendedorId = vendedorForm ?? null;
  if (!(await validarVendedorAsignable(usuario, vendedorId)) && vendedorId !== actual?.vendedorId) {
    return { errores: { vendedorId: "No puedes asignar clientes a ese vendedor" } };
  }
  const reasigna = actual && actual.vendedorId !== vendedorId;
  if (reasigna && !tienePermiso(usuario.rol, "clientes.reasignar")) return { error: "No puedes reasignar clientes." };

  const otro = await db.cliente.findUnique({ where: { ruc: d.ruc }, select: { id: true, vendedorId: true } });
  if (otro && otro.id !== id) {
    const visible = await puedeVerCliente(usuario, otro);
    return {
      errores: {
        ruc: visible
          ? "Ya existe un cliente con este RUC"
          : "Este RUC ya está en la cartera de otro vendedor. Pide a tu supervisor que te lo asigne.",
      },
    };
  }

  const datos = {
    ...d,
    nombreComercial: d.nombreComercial ?? null,
    contactoNombre: d.contactoNombre ?? null,
    telefono: d.telefono ?? null,
    whatsapp: d.whatsapp ?? d.telefono ?? null,
    email: d.email?.toLowerCase() ?? null,
    direccion: d.direccion ?? null,
    distrito: d.distrito ?? null,
    departamento: d.departamento ?? null,
    zonaId: d.zonaId ?? null,
    listaPrecioId: d.listaPrecioId ?? null,
    notas: d.notas ?? null,
    vendedorId,
    // Solo admin/supervisor fijan la categoría a mano
    ...(usuario.rol !== "VENDEDOR" ? { categoriaManual, ...(categoriaManual && categoria ? { categoria } : {}) } : {}),
  };

  const cliente = await db.$transaction(async (tx) => {
    if (actual) {
      const actualizado = await tx.cliente.update({ where: { id: actual.id }, data: datos });
      if (reasigna) {
        await tx.clienteAsignacionHistorial.create({
          data: { clienteId: actual.id, desdeVendedorId: actual.vendedorId, haciaVendedorId: vendedorId, asignadoPorId: usuario.id, motivo: "Edición de ficha" },
        });
        await registrarAuditoria(
          { usuarioId: usuario.id, accion: "cliente.reasignar", entidad: "Cliente", entidadId: actual.id, antes: { vendedorId: actual.vendedorId }, despues: { vendedorId } },
          tx,
        );
      }
      if (actual.categoria !== actualizado.categoria || actual.listaPrecioId !== actualizado.listaPrecioId) {
        await registrarAuditoria(
          {
            usuarioId: usuario.id, accion: "cliente.condiciones", entidad: "Cliente", entidadId: actual.id,
            antes: { categoria: actual.categoria, listaPrecioId: actual.listaPrecioId },
            despues: { categoria: actualizado.categoria, listaPrecioId: actualizado.listaPrecioId },
          },
          tx,
        );
      }
      return actualizado;
    }
    const creado = await tx.cliente.create({ data: datos });
    if (vendedorId) {
      await tx.clienteAsignacionHistorial.create({
        data: { clienteId: creado.id, haciaVendedorId: vendedorId, asignadoPorId: usuario.id, motivo: "Alta de cliente" },
      });
    }
    return creado;
  });

  revalidatePath("/clientes");
  redirect(`/clientes/${cliente.id}`);
}

export async function reasignarCliente(clienteId: string, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const usuario = await requireUsuario();
  if (!tienePermiso(usuario.rol, "clientes.reasignar")) return { error: "No tienes permiso para reasignar clientes." };
  const haciaId = String(formData.get("haciaId") ?? "") || null;
  const motivo = String(formData.get("motivo") ?? "").trim() || null;

  const cliente = await db.cliente.findUnique({ where: { id: clienteId }, select: { id: true, vendedorId: true } });
  if (!cliente || !(await puedeVerCliente(usuario, cliente))) return { error: "Cliente no encontrado." };
  if (cliente.vendedorId === haciaId) return { errores: { haciaId: "Ya está asignado a ese vendedor" } };
  if (!(await validarVendedorAsignable(usuario, haciaId))) return { errores: { haciaId: "No puedes asignar a ese vendedor" } };

  await db.$transaction(async (tx) => {
    await tx.cliente.update({ where: { id: clienteId }, data: { vendedorId: haciaId } });
    // Las oportunidades abiertas siguen al cliente
    if (haciaId) {
      await tx.oportunidad.updateMany({
        where: { clienteId, etapa: { notIn: ["GANADO", "PERDIDO"] } },
        data: { vendedorId: haciaId },
      });
    }
    await tx.clienteAsignacionHistorial.create({
      data: { clienteId, desdeVendedorId: cliente.vendedorId, haciaVendedorId: haciaId, asignadoPorId: usuario.id, motivo },
    });
    await registrarAuditoria(
      { usuarioId: usuario.id, accion: "cliente.reasignar", entidad: "Cliente", entidadId: clienteId, antes: { vendedorId: cliente.vendedorId }, despues: { vendedorId: haciaId, motivo } },
      tx,
    );
  });
  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true, mensaje: "Cliente reasignado." };
}

// ─────────────────────────── Importación CSV / Excel ───────────────────────────

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILAS = 5000;

export type ResultadoImportacion = {
  error?: string;
  modo?: "previsualizar" | "confirmar";
  filas?: (FilaValidada & { accion: "crear" | "actualizar" | "omitir" })[];
  resumen?: { total: number; validas: number; conErrores: number; crear: number; actualizar: number; omitir: number };
  importados?: { creados: number; actualizados: number };
} | undefined;

async function leerArchivo(archivo: File): Promise<string[][]> {
  const nombre = archivo.name.toLowerCase();
  const buffer = Buffer.from(await archivo.arrayBuffer());
  if (nombre.endsWith(".xlsx")) {
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(buffer as unknown as ArrayBuffer);
    const hoja = libro.worksheets[0];
    if (!hoja) return [];
    const matriz: string[][] = [];
    hoja.eachRow({ includeEmpty: false }, (fila) => {
      const valores: string[] = [];
      for (let c = 1; c <= hoja.columnCount; c++) valores.push(fila.getCell(c).text ?? "");
      matriz.push(valores);
    });
    return matriz;
  }
  if (nombre.endsWith(".csv") || nombre.endsWith(".txt")) {
    const texto = buffer.toString("utf8").replace(/^﻿/, "");
    const r = Papa.parse<string[]>(texto, { skipEmptyLines: true, delimiter: "" }); // autodetecta , ; o tab
    return r.data;
  }
  throw new Error("Formato no soportado. Usa .csv o .xlsx");
}

export async function importarClientes(_prev: ResultadoImportacion, formData: FormData): Promise<ResultadoImportacion> {
  const usuario = await requireUsuario();
  if (!tienePermiso(usuario.rol, "clientes.importar")) return { error: "No tienes permiso para importar clientes." };

  const archivo = formData.get("archivo");
  const modo = formData.get("modo") === "confirmar" ? "confirmar" : "previsualizar";
  const duplicados = formData.get("duplicados") === "actualizar" ? "actualizar" : "omitir";
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Selecciona un archivo." };
  if (archivo.size > MAX_BYTES) return { error: "El archivo supera los 5 MB." };

  let matriz: string[][];
  try {
    matriz = await leerArchivo(archivo);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo leer el archivo." };
  }
  const { filas: crudas, faltantes } = filasDesdeMatriz(matriz);
  if (faltantes.length) return { error: `Faltan columnas obligatorias: ${faltantes.join(", ")}. Descarga la plantilla.` };
  if (crudas.length === 0) return { error: "El archivo no tiene filas con datos." };
  if (crudas.length > MAX_FILAS) return { error: `Máximo ${MAX_FILAS} filas por importación.` };

  const [vendedores, zonas] = await Promise.all([
    vendedoresAsignables(usuario),
    db.zona.findMany({ select: { id: true, nombre: true } }),
  ]);
  const ctx = { vendedores, zonas, vendedorPorDefecto: usuario.rol === "ADMIN" ? null : usuario.id };
  const validadas = marcarDuplicadosInternos(crudas.map((f, i) => validarFila(f, i + 2, ctx)));

  const existentes = await db.cliente.findMany({
    where: { ruc: { in: validadas.map((f) => f.datos.ruc).filter((r) => r.length === 11) } },
    select: { id: true, ruc: true, vendedorId: true },
  });
  const porRuc = new Map(existentes.map((c) => [c.ruc, c]));

  const filas = await Promise.all(
    validadas.map(async (f) => {
      const existente = porRuc.get(f.datos.ruc);
      let accion: "crear" | "actualizar" | "omitir" = "crear";
      if (existente) {
        if (duplicados === "omitir") accion = "omitir";
        else if (!(await puedeVerCliente(usuario, existente))) {
          f.errores.push("El RUC ya pertenece a la cartera de otro vendedor");
        } else accion = "actualizar";
      }
      return { ...f, accion };
    }),
  );
  const validas = filas.filter((f) => f.errores.length === 0);
  const resumen = {
    total: filas.length,
    validas: validas.length,
    conErrores: filas.length - validas.length,
    crear: validas.filter((f) => f.accion === "crear").length,
    actualizar: validas.filter((f) => f.accion === "actualizar").length,
    omitir: validas.filter((f) => f.accion === "omitir").length,
  };

  if (modo === "previsualizar") return { modo, filas, resumen };

  let creados = 0;
  let actualizados = 0;
  await db.$transaction(
    async (tx) => {
      for (const f of validas) {
        if (f.accion === "omitir") continue;
        const { categoria, ...d } = f.datos;
        const datos = { ...d, ...(categoria ? { categoria, categoriaManual: true } : {}) };
        if (f.accion === "actualizar") {
          const existente = porRuc.get(d.ruc)!;
          // Al actualizar no se cambia el vendedor (eso es una reasignación explícita)
          const { vendedorId: _ignorar, ...sinVendedor } = datos;
          void _ignorar;
          await tx.cliente.update({ where: { id: existente.id }, data: sinVendedor });
          actualizados++;
        } else {
          const nuevo = await tx.cliente.create({ data: datos });
          if (d.vendedorId) {
            await tx.clienteAsignacionHistorial.create({
              data: { clienteId: nuevo.id, haciaVendedorId: d.vendedorId, asignadoPorId: usuario.id, motivo: "Importación" },
            });
          }
          creados++;
        }
      }
      await registrarAuditoria(
        { usuarioId: usuario.id, accion: "cliente.importar", entidad: "Cliente", despues: { archivo: archivo.name, creados, actualizados, conErrores: resumen.conErrores } },
        tx,
      );
    },
    { timeout: 60_000 },
  );

  revalidatePath("/clientes");
  return { modo, resumen, importados: { creados, actualizados }, filas: filas.filter((f) => f.errores.length > 0) };
}
