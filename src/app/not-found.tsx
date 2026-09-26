import Link from "next/link";

export default function NoEncontrado() {
  return (
    <main className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-5xl font-semibold text-marca-700">404</p>
      <h1 className="mt-2 text-xl font-semibold">No encontramos esta página</h1>
      <p className="mt-2 text-sm text-texto-suave">Puede que no exista o que no tengas acceso a ella.</p>
      <Link href="/" className="mt-6 inline-block rounded-lg bg-marca-700 px-4 py-2.5 text-sm font-medium text-white">Volver al inicio</Link>
    </main>
  );
}
