"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { definirStatusConteudoAction } from "@/lib/actions/contents";
import { toast } from "@/lib/ui/toast";
import { STATUS_OPTIONS, type ContentStatus } from "@/types";
import { cn } from "@/lib/utils";

interface QuickStatusProps {
  id: string;
  status: ContentStatus;
  className?: string;
}

/** Select para alterar o status do conteúdo rapidamente. */
export function QuickStatus({ id, status, className }: QuickStatusProps) {
  const router = useRouter();
  const [processando, iniciar] = useTransition();

  function alterar(novo: ContentStatus) {
    if (novo === status) return;
    iniciar(async () => {
      const r = await definirStatusConteudoAction(id, novo);
      if (!r.ok) toast.erro(r.error ?? "Não foi possível alterar o status.");
      else toast.sucesso("Status atualizado");
      router.refresh();
    });
  }

  return (
    <select
      aria-label="Alterar status"
      value={status}
      disabled={processando}
      onChange={(e) => alterar(e.target.value as ContentStatus)}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "max-w-[11rem] rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-60",
        className,
      )}
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
