import { cn } from "@/lib/utils";
import { forwardRef, type SelectHTMLAttributes } from "react";

/** Campo de seleção padrão do design system. */
export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50",
        className,
      )}
      {...props}
    />
  );
});
