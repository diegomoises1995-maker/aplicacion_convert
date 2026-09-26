import { Footprints } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="grid size-8 place-items-center rounded-lg bg-marca-700 text-white">
        <Footprints className="size-5" aria-hidden />
      </span>
      <span>
        Convert <span className="font-normal text-texto-suave">Ventas</span>
      </span>
    </span>
  );
}
