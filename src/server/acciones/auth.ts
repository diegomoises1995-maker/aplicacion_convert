"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn, signOut } from "@/auth";

export type EstadoLogin = { error?: string } | undefined;

// Solo se aceptan rutas internas para evitar redirecciones abiertas.
function destinoSeguro(valor: FormDataEntryValue | null): string {
  if (typeof valor !== "string" || !valor) return "/";
  try {
    const url = new URL(valor, "http://interno");
    return url.pathname.startsWith("/login") ? "/" : url.pathname + url.search;
  } catch {
    return "/";
  }
}

export async function iniciarSesion(_prev: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: destinoSeguro(formData.get("callbackUrl")),
    });
  } catch (error) {
    if (error instanceof CredentialsSignin && error.code === "bloqueado") {
      return { error: "Demasiados intentos fallidos. Espera 15 minutos o pide a tu gerente que restablezca tu contraseña." };
    }
    if (error instanceof AuthError) {
      return { error: "Correo o contraseña incorrectos, o el usuario está inactivo." };
    }
    throw error; // la redirección de éxito se propaga como excepción
  }
}

export async function cerrarSesion() {
  await signOut({ redirectTo: "/login" });
}
