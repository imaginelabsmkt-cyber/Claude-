"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { QuickStatus } from "@/components/contents/quick-status";
import { PriorityBadge } from "@/components/shared/status-badge";
import { corPrioridade } from "@/lib/ui/prioridade";
import { formatarData } from "@/lib/utils";
import {
  proximaAcao,
  prazoPrincipal,
  statusAoConcluir,
  ehArte,
} from "@/lib/rules/contents";
import { rotuloStatus, rotuloAcao } from "@/lib/ui/rotulos-arte";
import { definirStatusConteudoAction } from "@/lib/actions/contents";
import { toast } from "@/lib/ui/toast";
import type { Content } from "@/types";

interface TaskCardProps {
  content: Content;
  clienteNome: string;
  cor?: string | null;
}

/** Card de uma tarefa: dados + mudar status + concluir a próxima ação. */
export function TaskCard({ content, clienteNome, cor }: TaskCardProps) {
  const router = useRouter();
  const [processando, iniciar] = useTransition();
  const proximo = statusAoConcluir(content.status);
  const arte = ehArte(content.format);

  function concluir() {
    if (!proximo) return;
    iniciar(async () => {
      const r = await definirStatusConteudoAction(content.id, proximo);
      if (!r.ok) toast.erro(r.error ?? "Não foi possível concluir.");
      else toast.sucesso("Tarefa concluída");
      router.refresh();
    });
  }

  return (
    <div
      className="rounded-lg border border-l-4 border-gray-200 bg-white p-3 shadow-sm"
      style={{ borderLeftColor: corPrioridade(content.priority) }}
    >
      <Link
        href={`/clientes/${content.client_id}`}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-700"
      >
        <span
          className="inline-block h-2.5 w-2.5 rounded-full border border-gray-200"
          style={{ backgroundColor: cor ?? "#e5e7eb" }}
          aria-hidden="true"
        />
        <span className="truncate hover:underline">{clienteNome}</span>
      </Link>

      <Link
        href={`/conteudos/${content.id}`}
        className="mt-0.5 block font-medium text-gray-900 hover:text-brand-700"
      >
        {content.title}
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
        <span>
          Próxima ação:{" "}
          <span className="font-medium text-gray-700">
            {rotuloAcao(proximaAcao(content.status), arte)}
          </span>
        </span>
        <span>Prazo: {formatarData(prazoPrincipal(content))}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <QuickStatus id={content.id} status={content.status} format={content.format} />
        <PriorityBadge priority={content.priority} />
        {proximo ? (
          <Button
            tamanho="sm"
            disabled={processando}
            onClick={concluir}
            className="ml-auto"
          >
            {processando ? "..." : `Concluir → ${rotuloStatus(proximo, arte)}`}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
