import { cn } from "@/lib/utils";
import { forwardRef, type TextareaHTMLAttributes } from "react";

/** Área de texto padrão do design system. */
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50",
        className,
      )}
      {...props}
    />
  );
});
