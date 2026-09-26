import { Footprints } from "lucide-react";
import { cn } from "@/lib/utils";

/** Foto del modelo (URL externa o /catalogo/...). Sin optimización para admitir cualquier origen. */
export function FotoModelo({ src, alt, className }: { src: string | null | undefined; alt: string; className?: string }) {
  if (!src) {
    return (
      <div className={cn("grid place-items-center bg-stone-100 text-stone-400", className)}>
        <Footprints className="size-8" aria-hidden />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" className={cn("object-cover", className)} />;
}
