import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-borde bg-superficie p-4 shadow-sm md:p-5", className)}
      {...props}
    />
  );
}

export function CardTitulo({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-base font-semibold", className)} {...props} />;
}

export function Badge({
  className,
  tono = "neutro",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tono?: "neutro" | "verde" | "amarillo" | "rojo" | "marca";
}) {
  const tonos = {
    neutro: "bg-stone-100 text-stone-700",
    verde: "bg-emerald-50 text-emerald-700",
    amarillo: "bg-amber-50 text-amber-700",
    rojo: "bg-red-50 text-red-700",
    marca: "bg-marca-50 text-marca-700",
  };
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tonos[tono], className)}
      {...props}
    />
  );
}

export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion?: string;
  acciones?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold md:text-2xl">{titulo}</h1>
        {descripcion && <p className="mt-1 text-sm text-texto-suave">{descripcion}</p>}
      </div>
      {acciones}
    </div>
  );
}
