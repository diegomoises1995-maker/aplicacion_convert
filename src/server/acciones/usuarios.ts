"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { datosForm, erroresDeZod, type EstadoForm } from "@/lib/form";
import { requirePermiso, requireUsuario, puedeVerVendedor } from "@/server/sesion";
import { registrarAuditoria } from "@/server/auditoria";
import { tienePermiso } from "@/lib/permisos";

const password = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .regex(/[A-Za-z]/, "Debe incluir una letra")
  .regex(/\d/, "Debe incluir un número");

const usuarioSchema = z.object({
  nombre: z.string().min(3, "Ingresa el nombre completo").max(100),
  email: z.string().toLowerCase().email("Correo inválido"),
  telefono: z.string().regex(/^[\d +()-]{6,20}$/, "Teléfono inválido").optional(),
  dni: z.string().regex(/^\d{8}$/, "El DNI debe tener 8 dígitos").optional(),
  rol: z.enum(["ADMIN", "SUPERVISOR", "VENDEDOR"]),
  canal: z.enum(["CAMPO", "REMOTO", "MIXTO"]).default("MIXTO"),
  zonaId: z.string().optional(),
  supervisorId: z.string().optional(),
  activo: z.string().optional().transform((v) => v === "on"),
  password: z.string().optional(),
});

// Campos que se guardan en auditoría (nunca el hash de la contraseña).
const SELECT_AUDITABLE = {
  nombre: true, email: true, telefono: true, dni: true, rol: true, canal: true,
  zonaId: true, supervisorId: true, activo: true,
} as const;

export async function guardarUsuario(id: string | null, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const admin = await requirePermiso("usuarios.gestionar");
  const parsed = usuarioSchema.safeParse(datosForm(formData));
  if (!parsed.success) return { errores: erroresDeZod(parsed.error) };
  const d = parsed.data;

  if (!id) {
    const p = password.safeParse(d.password ?? "");
    if (!p.success) return { errores: { password: p.error.issues[0]!.message } };
  }
  if (d.rol !== "VENDEDOR") d.supervisorId = undefined;
  if (d.supervisorId) {
    const sup = await db.user.findUnique({ where: { id: d.supervisorId }, select: { rol: true, activo: true } });
    if (!sup || sup.rol !== "SUPERVISOR" || !sup.activo) return { errores: { supervisorId: "Elige un supervisor activo" } };
  }
  if (id === admin.id && (!d.activo || d.rol !== "ADMIN")) {
    return { error: "No puedes desactivarte ni quitarte el rol de administrador a ti mismo." };
  }
  const duplicado = await db.user.findFirst({
    where: { OR: [{ email: d.email }, ...(d.dni ? [{ dni: d.dni }] : [])], NOT: id ? { id } : undefined },
    select: { email: true },
  });
  if (duplicado) {
    return { errores: duplicado.email === d.email ? { email: "Ya existe un usuario con ese correo" } : { dni: "Ya existe un usuario con ese DNI" } };
  }

  const datos = {
    nombre: d.nombre,
    email: d.email,
    telefono: d.telefono ?? null,
    dni: d.dni ?? null,
    rol: d.rol,
    canal: d.canal,
    zonaId: d.zonaId ?? null,
    supervisorId: d.supervisorId ?? null,
    activo: id ? d.activo : true,
  };

  const guardado = await db.$transaction(async (tx) => {
    if (id) {
      const antes = await tx.user.findUniqueOrThrow({ where: { id }, select: SELECT_AUDITABLE });
      const despues = await tx.user.update({ where: { id }, data: datos, select: { id: true, ...SELECT_AUDITABLE } });
      await registrarAuditoria({ usuarioId: admin.id, accion: "usuario.actualizar", entidad: "User", entidadId: id, antes, despues }, tx);
      return despues;
    }
    const creado = await tx.user.create({
      data: { ...datos, passwordHash: await bcrypt.hash(d.password!, 10), fechaIngreso: new Date() },
      select: { id: true, ...SELECT_AUDITABLE },
    });
    await registrarAuditoria({ usuarioId: admin.id, accion: "usuario.crear", entidad: "User", entidadId: creado.id, despues: creado }, tx);
    return creado;
  });

  revalidatePath("/equipo");
  if (!id) redirect(`/equipo/${guardado.id}`);
  return { ok: true, mensaje: "Cambios guardados." };
}

export async function restablecerPassword(id: string, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const admin = await requirePermiso("usuarios.gestionar");
  const p = password.safeParse(formData.get("password"));
  if (!p.success) return { errores: { password: p.error.issues[0]!.message } };

  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(p.data, 10) } });
    await registrarAuditoria({ usuarioId: admin.id, accion: "usuario.restablecer_password", entidad: "User", entidadId: id }, tx);
  });
  return { ok: true, mensaje: "Contraseña restablecida. Compártela con el usuario de forma segura." };
}

/** Pasa todos los clientes de un vendedor a otro (p. ej. al desactivarlo). */
export async function reasignarCartera(desdeId: string, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const usuario = await requireUsuario();
  if (!tienePermiso(usuario.rol, "clientes.reasignar")) return { error: "No tienes permiso para reasignar clientes." };

  const haciaId = String(formData.get("haciaId") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim() || "Reasignación de cartera";
  if (!haciaId || haciaId === desdeId) return { errores: { haciaId: "Elige otro vendedor" } };
  if (!(await puedeVerVendedor(usuario, desdeId)) || !(await puedeVerVendedor(usuario, haciaId))) {
    return { error: "Solo puedes reasignar entre vendedores de tu equipo." };
  }
  const destino = await db.user.findUnique({ where: { id: haciaId }, select: { activo: true, rol: true } });
  if (!destino?.activo || destino.rol === "ADMIN") return { errores: { haciaId: "El vendedor destino debe estar activo" } };

  const n = await db.$transaction(async (tx) => {
    const clientes = await tx.cliente.findMany({ where: { vendedorId: desdeId }, select: { id: true } });
    if (clientes.length === 0) return 0;
    await tx.cliente.updateMany({ where: { vendedorId: desdeId }, data: { vendedorId: haciaId } });
    await tx.clienteAsignacionHistorial.createMany({
      data: clientes.map((c) => ({ clienteId: c.id, desdeVendedorId: desdeId, haciaVendedorId: haciaId, asignadoPorId: usuario.id, motivo })),
    });
    await registrarAuditoria(
      { usuarioId: usuario.id, accion: "cliente.reasignar_cartera", entidad: "User", entidadId: desdeId, antes: { vendedorId: desdeId }, despues: { vendedorId: haciaId, clientes: clientes.length, motivo } },
      tx,
    );
    return clientes.length;
  });

  revalidatePath("/equipo");
  revalidatePath("/clientes");
  return { ok: true, mensaje: n ? `${n} cliente(s) reasignados.` : "Este vendedor no tiene clientes asignados." };
}
