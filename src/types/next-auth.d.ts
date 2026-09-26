import type { Rol } from "@/lib/permisos";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    rol: Rol;
  }
  interface Session {
    user: {
      id: string;
      rol: Rol;
      name: string;
      email: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    rol: Rol;
  }
}
