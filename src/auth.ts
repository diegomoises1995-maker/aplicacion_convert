import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { db } from "@/lib/db";
import { bloqueado, limpiarIntentos, registrarFallo } from "@/lib/limite-intentos";

const credencialesSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

// Hash de relleno para comparar en tiempo constante cuando el correo no existe.
const HASH_FALSO = bcrypt.hashSync(crypto.randomUUID(), 10);

class CredencialesInvalidas extends CredentialsSignin {
  code = "credenciales";
}

class DemasiadosIntentos extends CredentialsSignin {
  code = "bloqueado";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  logger: {
    // Una contraseña incorrecta no es un error del sistema: no ensuciar los logs.
    error(error) {
      if (error instanceof CredentialsSignin || error.name === "CredentialsSignin") return;
      console.error(error);
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Correo" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(raw) {
        const parsed = credencialesSchema.safeParse(raw);
        if (!parsed.success) throw new CredencialesInvalidas();

        const clave = parsed.data.email;
        if (bloqueado(clave)) throw new DemasiadosIntentos();

        const user = await db.user.findUnique({ where: { email: parsed.data.email } });
        // Se compara el hash aunque el usuario no exista para no revelar qué correos existen.
        const hash = user?.passwordHash ?? HASH_FALSO;
        const ok = await bcrypt.compare(parsed.data.password, hash);
        if (!user || !ok || !user.activo) {
          registrarFallo(clave);
          throw new CredencialesInvalidas();
        }
        limpiarIntentos(clave);

        await db.user.update({ where: { id: user.id }, data: { ultimoAcceso: new Date() } });
        return { id: user.id, email: user.email, name: user.nombre, rol: user.rol };
      },
    }),
  ],
});
