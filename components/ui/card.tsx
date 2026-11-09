import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

/**
 * Contêiner de cartão padrão.
 *
 * Papel creme claro sobre o papel creme da página, borda de um passo só
 * e sombra tingida de vinho. Os três juntos é que dão o relevo: borda
 * sozinha sobre fundo liso é o que deixava a tela com cara de planilha.
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-200 bg-white shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pb-0", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base font-semibold text-gray-900", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}
