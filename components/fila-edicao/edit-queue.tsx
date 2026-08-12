"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  PriorityBadge,
  StatusContentBadge,
} from "@/components/shared/status-badge";
import { formatarData } from "@/lib/utils";
import { toast } from "@/lib/ui/toast";
import { corPrioridade } from "@/lib/ui/prioridade";
import { prazoPrincipal } from "@/lib/rules/contents";
import {
  definirStatusConteudoAction,
  agendarSessaoEdicaoAction,
} from "@/lib/actions/contents";
import type { Content, ContentStatus } from "@/types";
import type { OpcaoCliente } from "@/lib/data/contents";

interface EditQueueProps {
  itens: Content[];
  clientes: OpcaoCliente[];
}

/** Ações contextuais por status (rótulo -> novo status). */
function acoesPara(status: ContentStatus): { label: string; to: ContentStatus }[] {
  switch (status) {
    case "Gravado":
      return [
        { label: "Adicionar à fila", to: "Fila de edição" },
        { label: "Iniciar edição", to: "Em edição" },
      ];
    case "Fila de edição":
      return [{ label: "Iniciar edição", to: "Em edição" }];
    case "Em edição":
      return [
        { label: "Enviar para revisão", to: "Revisão interna" },
        { label: "Marcar como ajuste", to: "Ajustes" },
      ];
    case "Ajustes":
      return [{ label: "Finalizar ajustes", to: "Revisão interna" }];
    case "Revisão interna":
      return [{ label: "Marcar como aprovado", to: "Aprovado" }];
    default:
      return [];
  }
}

const CLASSE_MINI =
  "rounded-md border border-gray-300 bg-white px-1.5 py-0.5 text-xs text-gray-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-50";

function ItemFila({
  content,
  cliente,
}: {
  content: Content;
  cliente?: OpcaoCliente;
}) {
  const router = useRouter();
  const [processando, iniciar] = useTransition();
  const prazo = prazoPrincipal(content);
  const primaria = acoesPara(content.status)[0];

  function mudarStatus(to: ContentStatus) {
    iniciar(async () => {
      const r = await definirStatusConteudoAction(content.id, to);
      if (!r.ok) toast.erro(r.error ?? "Não foi possível mudar o status.");
      router.refresh();
    });
  }

  function agendarEdicao(data: string | null, hora: string | null) {
    iniciar(async () => {
      const r = await agendarSessaoEdicaoAction(content.id, data, hora);
      if (!r.ok) toast.erro(r.error ?? "Não foi possível agendar a edição.");
      else toast.sucesso(data ? "Edição agendada" : "Edição desmarcada");
      router.refresh();
    });
  }

  return (
    <div
      style={{ borderLeftColor: corPrioridade(content.priority) }}
      className="rounded-lg border border-l-4 border-gray-200 bg-white p-2.5 shadow-sm"
    >
      <div className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full border border-gray-200"
              style={{ backgroundColor: cliente?.color ?? "#e5e7eb" }}
              aria-hidden="true"
            />
            <span className="truncate">{cliente?.name ?? "—"}</span>
            {prazo ? (
              <span className="shrink-0 text-gray-400">
                · entrega {formatarData(prazo)}
              </span>
            ) : null}
            {content.revision_count > 0 ? (
              <span className="shrink-0 text-amber-600">
                · {content.revision_count} ajuste
                {content.revision_count > 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
          <Link
            href={`/conteudos/${content.id}`}
            className="block truncate font-medium text-gray-900 hover:text-brand-700"
          >
            {content.title}
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <StatusContentBadge status={content.status} />
          <PriorityBadge priority={content.priority} />
          {primaria ? (
            <Button
              tamanho="sm"
              variante="secundaria"
              disabled={processando}
              onClick={() => mudarStatus(primaria.to)}
            >
              {primaria.label}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Agendar quando vai editar (vira bloco no Google Agenda) */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
        <span className="font-medium">🗓️ Editar em:</span>
        <input
          type="date"
          value={content.editing_date ?? ""}
          disabled={processando}
          onChange={(e) => agendarEdicao(e.target.value || null, content.editing_time)}
          className={CLASSE_MINI}
        />
        <input
          type="time"
          value={content.editing_time ?? ""}
          disabled={processando || !content.editing_date}
          onChange={(e) => agendarEdicao(content.editing_date, e.target.value || null)}
          className={CLASSE_MINI}
        />
        {content.editing_date ? (
          <button
            type="button"
            disabled={processando}
            onClick={() => agendarEdicao(null, null)}
            className="text-gray-400 hover:text-red-600"
          >
            limpar
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Fila de edição: lista corrida, já ordenada por urgência. Cada card tem um
 * controle "Editar em" para agendar quando editar (vira bloco no Google
 * Agenda), sem mudar a lista.
 */
export function EditQueue({ itens, clientes }: EditQueueProps) {
  const clientesById = new Map(clientes.map((c) => [c.id, c]));
  return (
    <div className="space-y-2">
      {itens.map((c) => (
        <ItemFila
          key={c.id}
          content={c}
          cliente={clientesById.get(c.client_id)}
        />
      ))}
    </div>
  );
}
