import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variante = "primaria" | "secundaria" | "fantasma" | "perigo";
type Tamanho = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamanho?: Tamanho;
}

const estilosVariante: Record<Variante, string> = {
  primaria: "bg-brand-600 text-white hover:bg-brand-700",
  secundaria:
    "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50",
  fantasma: "bg-transparent text-gray-700 hover:bg-gray-100",
  perigo: "bg-red-600 text-white hover:bg-red-700",
};

const estilosTamanho: Record<Tamanho, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

/** Botão base do design system. */
export function Button({
  variante = "primaria",
  tamanho = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50",
        estilosVariante[variante],
        estilosTamanho[tamanho],
        className,
      )}
      {...props}
    />
  );
}
