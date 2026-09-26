import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/server/sesion";
import { Logo } from "@/components/marca/logo";
import { FormularioLogin } from "./formulario";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  if (await getUsuarioActual()) redirect("/");

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo className="text-xl" />
        </div>
        <div className="rounded-2xl border border-borde bg-superficie p-6 shadow-sm">
          <h1 className="text-lg font-semibold">Ingresar</h1>
          <p className="mb-5 mt-1 text-sm text-texto-suave">Usa el correo y contraseña que te asignó tu gerente.</p>
          <FormularioLogin callbackUrl={callbackUrl} />
        </div>
      </div>
    </main>
  );
}
