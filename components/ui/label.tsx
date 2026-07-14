import { cn } from "@/lib/utils";
import type { LabelHTMLAttributes } from "react";

/** Rótulo padrão de campo de formulário. */
export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1 block text-sm font-medium text-gray-700", className)}
      {...props}
    />
  );
}
