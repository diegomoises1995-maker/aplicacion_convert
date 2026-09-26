import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const variantes = {
  primario: "bg-marca-700 text-white hover:bg-marca-600 disabled:bg-marca-200",
  secundario: "border border-borde bg-superficie text-texto hover:bg-fondo",
  peligro: "bg-red-600 text-white hover:bg-red-500",
  fantasma: "text-texto-suave hover:bg-fondo hover:text-texto",
} as const;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: keyof typeof variantes;
  tamano?: "sm" | "md";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variante = "primario", tamano = "md", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-500 disabled:cursor-not-allowed",
        tamano === "md" ? "h-11 px-4 text-sm" : "h-9 px-3 text-sm",
        variantes[variante],
        className,
      )}
      {...props}
    />
  );
});
