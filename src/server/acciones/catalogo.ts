"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { datosForm, erroresDeZod, type EstadoForm } from "@/lib/form";
import { paresPorSerie, tallasDe, type Distribucion } from "@/lib/stock";
import { requirePermiso } from "@/server/sesion";
import { registrarAuditoria } from "@/server/auditoria";

const GENEROS = ["CABALLERO", "DAMA", "NINO", "UNISEX"] as const;

const modeloSchema = z.object({
  sku: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,20}$/, "SKU: 3 a 20 letras, números o guiones"),
  nombre: z.string().min(2, "Ingresa el nombre").max(100),
  descripcion: z.string().max(1000).optional(),
  genero: z.enum(GENEROS),
  material: z.string().max(60).default("Cuero"),
  precioBase: z.coerce.number({ message: "Precio inválido" }).positive("Debe ser mayor que 0").max(100_000),
  costo: z.coerce.number().min(0).max(100_000).optional(),
  curvaId: z.string({ message: "Elige una curva" }),
  fotos: z.string().optional().transform((v) =>
    (v ?? "").split(/\s+/).map((u) => u.trim()).filter((u) => /^(https?:\/\/|\/)/.test(u)).slice(0, 8),
  ),
  activo: z.string().optional().transform((v) => v === "on"),
});

export async function guardarModelo(id: string | null, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const admin = await requirePermiso("catalogo.gestionar");
  const parsed = modeloSchema.safeParse(datosForm(formData));
  if (!parsed.success) return { errores: erroresDeZod(parsed.error) };
  const d = parsed.data;
  const dup = await db.modelo.findFirst({ where: { sku: d.sku, NOT: id ? { id } : undefined } });
  if (dup) return { errores: { sku: "Ya existe un modelo con ese SKU" } };

  const datos = { ...d, costo: d.costo ?? null, descripcion: d.descripcion ?? null, activo: id ? d.activo : true };
  const antes = id ? await db.modelo.findUnique({ where: { id } }) : null;
  if (id && !antes) return { error: "Modelo no encontrado." };
  if (antes && antes.curvaId !== d.curvaId && (await db.variante.count({ where: { modeloId: antes.id, stock: { gt: 0 } } })) > 0) {
    return { errores: { curvaId: "No se puede cambiar la curva de un modelo con stock" } };
  }

  const modeloId = await db.$transaction(async (tx) => {
    if (antes) {
      await tx.modelo.update({ where: { id: antes.id }, data: datos });
      if (Number(antes.precioBase) !== d.precioBase || Number(antes.costo ?? 0) !== (d.costo ?? 0)) {
        await registrarAuditoria(
          { usuarioId: admin.id, accion: "precio.actualizar", entidad: "Modelo", entidadId: antes.id, antes: { sku: antes.sku, precioBase: antes.precioBase, costo: antes.costo }, despues: { sku: d.sku, precioBase: d.precioBase, costo: d.costo } },
          tx,
        );
      }
      return antes.id;
    }
    const m = await tx.modelo.create({ data: datos });
    await registrarAuditoria({ usuarioId: admin.id, accion: "modelo.crear", entidad: "Modelo", entidadId: m.id, despues: { sku: m.sku, precioBase: d.precioBase } }, tx);
    return m.id;
  });

  revalidatePath("/catalogo");
  if (!id) redirect(`/catalogo/${modeloId}`);
  revalidatePath(`/catalogo/${id}`);
  return { ok: true, mensaje: "Modelo guardado." };
}

export async function agregarColor(modeloId: string, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await requirePermiso("catalogo.gestionar");
  const nombre = String(formData.get("color") ?? "").trim();
  const hex = String(formData.get("hex") ?? "").trim();
  if (nombre.length < 2) return { errores: { color: "Escribe el color" } };
  if (hex && !/^#[0-9a-fA-F]{6}$/.test(hex)) return { errores: { hex: "Formato #RRGGBB" } };

  const modelo = await db.modelo.findUniqueOrThrow({ where: { id: modeloId }, include: { curva: true } });
  const color = await db.color.upsert({
    where: { nombre },
    update: hex ? { hex } : {},
    create: { nombre, hex: hex || null },
  });
  const tallas = tallasDe(modelo.curva.distribucion as Distribucion);
  await db.variante.createMany({
    data: tallas.map((talla) => ({ modeloId, colorId: color.id, talla, stock: 0 })),
    skipDuplicates: true,
  });
  revalidatePath(`/catalogo/${modeloId}`);
  return { ok: true, mensaje: `Color ${nombre} agregado.` };
}

export async function actualizarStock(modeloId: string, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const admin = await requirePermiso("catalogo.gestionar");
  const variantes = await db.variante.findMany({ where: { modeloId }, include: { color: true } });
  const cambios: { varianteId: string; color: string; talla: number; antes: number; despues: number }[] = [];
  for (const v of variantes) {
    const raw = formData.get(`stock_${v.id}`);
    if (raw === null) continue;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > 1_000_000) return { error: `Stock inválido en ${v.color.nombre} talla ${v.talla}` };
    if (n !== v.stock) cambios.push({ varianteId: v.id, color: v.color.nombre, talla: v.talla, antes: v.stock, despues: n });
  }
  if (cambios.length === 0) return { ok: true, mensaje: "Sin cambios." };

  await db.$transaction(async (tx) => {
    for (const c of cambios) await tx.variante.update({ where: { id: c.varianteId }, data: { stock: c.despues } });
    await registrarAuditoria({ usuarioId: admin.id, accion: "stock.ajustar", entidad: "Modelo", entidadId: modeloId, despues: cambios }, tx);
  });
  revalidatePath(`/catalogo/${modeloId}`);
  revalidatePath("/catalogo");
  return { ok: true, mensaje: `Stock actualizado (${cambios.length} talla${cambios.length === 1 ? "" : "s"}).` };
}

const curvaSchema = z.object({
  nombre: z.string().min(2).max(60),
  genero: z.enum(GENEROS),
  distribucion: z.string().transform((v, ctx) => {
    // Formato: "38:1, 39:2, 40:3"
    const d: Distribucion = {};
    for (const parte of v.split(/[,;\s]+/).filter(Boolean)) {
      const m = /^(\d{2}):(\d{1,2})$/.exec(parte);
      if (!m || Number(m[2]) === 0) {
        ctx.addIssue({ code: "custom", message: `"${parte}" no es válido. Usa talla:pares, ej. 38:1, 39:2` });
        return z.NEVER;
      }
      d[m[1]!] = Number(m[2]);
    }
    if (Object.keys(d).length < 2) {
      ctx.addIssue({ code: "custom", message: "Indica al menos 2 tallas" });
      return z.NEVER;
    }
    return d;
  }),
});

export async function guardarCurva(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const admin = await requirePermiso("catalogo.gestionar");
  const parsed = curvaSchema.safeParse(datosForm(formData));
  if (!parsed.success) return { errores: erroresDeZod(parsed.error) };
  if (await db.curvaTallas.findUnique({ where: { nombre: parsed.data.nombre } })) return { errores: { nombre: "Ya existe" } };
  const c = await db.curvaTallas.create({ data: { ...parsed.data, paresPorSerie: paresPorSerie(parsed.data.distribucion) } });
  await registrarAuditoria({ usuarioId: admin.id, accion: "curva.crear", entidad: "CurvaTallas", entidadId: c.id, despues: c });
  revalidatePath("/configuracion/curvas");
  return { ok: true, mensaje: `Curva creada (${c.paresPorSerie} pares por serie).` };
}
