import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type TomBadge = "cinza" | "azul" | "verde" | "amarelo" | "vermelho" | "roxo";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tom?: TomBadge;
}

const estilos: Record<TomBadge, string> = {
  cinza: "bg-gray-100 text-gray-700",
  azul: "bg-blue-100 text-blue-700",
  verde: "bg-green-100 text-green-700",
  amarelo: "bg-amber-100 text-amber-700",
  vermelho: "bg-red-100 text-red-700",
  roxo: "bg-brand-100 text-brand-700",
};

/** Etiqueta compacta para status, prioridades, etc. */
export function Badge({ tom = "cinza", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        estilos[tom],
        className,
      )}
      {...props}
    />
  );
}
