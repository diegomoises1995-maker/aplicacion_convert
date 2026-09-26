import Link from "next/link";
import { cn } from "@/lib/utils";

export function Vacio({ titulo, children }: { titulo: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-borde bg-superficie px-4 py-10 text-center">
      <p className="font-medium">{titulo}</p>
      {children && <div className="mt-1 text-sm text-texto-suave">{children}</div>}
    </div>
  );
}

export function Aviso({ tono = "info", children }: { tono?: "info" | "alerta" | "error" | "exito"; children: React.ReactNode }) {
  const tonos = {
    info: "bg-sky-50 text-sky-800",
    alerta: "bg-amber-50 text-amber-800",
    error: "bg-red-50 text-red-700",
    exito: "bg-emerald-50 text-emerald-700",
  };
  return <div className={cn("rounded-lg px-3 py-2 text-sm", tonos[tono])}>{children}</div>;
}

/** Pestañas por URL, con desplazamiento horizontal en celular. */
export function Pestanas({ items, actual }: { items: { href: string; titulo: string }[]; actual: string }) {
  return (
    <nav className="-mx-4 mb-5 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex min-w-max gap-1 border-b border-borde">
        {items.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              className={cn(
                "block border-b-2 px-3 py-2 text-sm font-medium",
                actual === i.href ? "border-marca-700 text-marca-700" : "border-transparent text-texto-suave hover:text-texto",
              )}
            >
              {i.titulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function BotonLink({
  href,
  variante = "primario",
  className,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; variante?: "primario" | "secundario" }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors",
        variante === "primario"
          ? "bg-marca-700 text-white hover:bg-marca-600"
          : "border border-borde bg-superficie hover:bg-fondo",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

export function Paginacion({ pagina, paginas, url }: { pagina: number; paginas: number; url: (p: number) => string }) {
  if (paginas <= 1) return null;
  return (
    <nav className="mt-4 flex items-center justify-between text-sm">
      {pagina > 1 ? <Link className="text-marca-700" href={url(pagina - 1)}>← Anterior</Link> : <span />}
      <span className="text-texto-suave">Página {pagina} de {paginas}</span>
      {pagina < paginas ? <Link className="text-marca-700" href={url(pagina + 1)}>Siguiente →</Link> : <span />}
    </nav>
  );
}

export function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-texto-suave">{etiqueta}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}
