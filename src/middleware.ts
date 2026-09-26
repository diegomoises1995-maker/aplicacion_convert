import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Todo excepto estáticos, imágenes y el endpoint de auth.
  matcher: ["/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico|icons|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)"],
};
