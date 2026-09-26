"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUsuario } from "@/server/sesion";
import { registrarAuditoria } from "@/server/auditoria";

const schema = z
  .object({
    actual: z.string().min(1, "Ingresa tu contraseña actual"),
    nueva: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Za-z]/, "Debe incluir al menos una letra")
      .regex(/\d/, "Debe incluir al menos un número"),
    confirmacion: z.string(),
  })
  .refine((d) => d.nueva === d.confirmacion, {
    message: "Las contraseñas no coinciden",
    path: ["confirmacion"],
  });

export type EstadoCambioPassword =
  | { ok?: boolean; errores?: Partial<Record<"actual" | "nueva" | "confirmacion", string>> }
  | undefined;

export async function cambiarPassword(
  _prev: EstadoCambioPassword,
  formData: FormData,
): Promise<EstadoCambioPassword> {
  const usuario = await requireUsuario();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const errores: Record<string, string> = {};
    for (const issue of parsed.error.issues) errores[String(issue.path[0])] ??= issue.message;
    return { errores };
  }

  const { passwordHash } = await db.user.findUniqueOrThrow({
    where: { id: usuario.id },
    select: { passwordHash: true },
  });
  if (!(await bcrypt.compare(parsed.data.actual, passwordHash))) {
    return { errores: { actual: "La contraseña actual no es correcta" } };
  }

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: usuario.id },
      data: { passwordHash: await bcrypt.hash(parsed.data.nueva, 10) },
    });
    await registrarAuditoria(
      { usuarioId: usuario.id, accion: "usuario.cambiar_password", entidad: "User", entidadId: usuario.id },
      tx,
    );
  });
  return { ok: true };
}
