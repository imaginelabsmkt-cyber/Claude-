import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

/** Campo de texto padrão do design system. */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50",
          className,
        )}
        {...props}
      />
    );
  },
);
