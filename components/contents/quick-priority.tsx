"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { definirPrioridadeConteudoAction } from "@/lib/actions/contents";
import { toast } from "@/lib/ui/toast";
import { PRIORITY_OPTIONS, type ContentPriority } from "@/types";
import { cn } from "@/lib/utils";

interface QuickPriorityProps {
  id: string;
  priority: ContentPriority;
  className?: string;
}

/** Select para alterar a prioridade do conteúdo rapidamente. */
export function QuickPriority({ id, priority, className }: QuickPriorityProps) {
  const router = useRouter();
  const [processando, iniciar] = useTransition();

  function alterar(nova: ContentPriority) {
    if (nova === priority) return;
    iniciar(async () => {
      const r = await definirPrioridadeConteudoAction(id, nova);
      if (!r.ok) toast.erro(r.error ?? "Não foi possível alterar a prioridade.");
      else toast.sucesso("Prioridade atualizada");
      router.refresh();
    });
  }

  return (
    <select
      aria-label="Alterar prioridade"
      value={priority}
      disabled={processando}
      onChange={(e) => alterar(e.target.value as ContentPriority)}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-60",
        className,
      )}
    >
      {PRIORITY_OPTIONS.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}
