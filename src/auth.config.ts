import type { NextAuthConfig } from "next-auth";
import { puedeAccederRuta, type Rol } from "@/lib/permisos";

// Configuración compatible con el runtime edge (middleware): sin Prisma ni bcrypt.
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 }, // 12 horas
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const logueado = !!auth?.user;
      const enLogin = nextUrl.pathname.startsWith("/login");

      if (enLogin) {
        // Se permite siempre: si la sesión es de un usuario desactivado, debe poder volver a entrar.
        return true;
      }
      if (!logueado) return false; // redirige a /login

      if (!puedeAccederRuta(auth.user.rol, nextUrl.pathname)) {
        return Response.redirect(new URL("/?acceso=denegado", nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.rol = user.rol;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.rol = token.rol as Rol;
      return session;
    },
  },
} satisfies NextAuthConfig;
