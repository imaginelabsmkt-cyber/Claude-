"use client";

import { useEffect, useState } from "react";
import { assinarToast, type Toast } from "@/lib/ui/toast";
import { cn } from "@/lib/utils";

/**
 * Exibe os toasts (canto inferior direito). Montado uma vez no layout.
 * Cada toast some sozinho depois de alguns segundos.
 */
export function Toaster() {
  const [itens, setItens] = useState<Toast[]>([]);

  useEffect(() => {
    return assinarToast((t) => {
      setItens((atual) => [...atual, t]);
      setTimeout(() => {
        setItens((atual) => atual.filter((x) => x.id !== t.id));
      }, 2600);
    });
  }, []);

  if (itens.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {itens.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "pointer-events-auto flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg",
            t.tipo === "sucesso" ? "bg-gray-900" : "bg-red-600",
          )}
        >
          <span aria-hidden="true">{t.tipo === "sucesso" ? "✓" : "⚠"}</span>
          {t.texto}
        </div>
      ))}
    </div>
  );
}
