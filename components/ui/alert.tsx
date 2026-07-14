import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type VarianteAlerta = "sucesso" | "erro" | "info";

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variante?: VarianteAlerta;
}

const estilos: Record<VarianteAlerta, string> = {
  sucesso: "bg-green-50 text-green-800 border-green-200",
  erro: "bg-red-50 text-red-800 border-red-200",
  info: "bg-blue-50 text-blue-800 border-blue-200",
};

/** Mensagem de feedback (sucesso/erro/info). */
export function Alert({ variante = "info", className, ...props }: AlertProps) {
  return (
    <div
      role={variante === "erro" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        estilos[variante],
        className,
      )}
      {...props}
    />
  );
}
