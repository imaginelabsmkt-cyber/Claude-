import Link from "next/link";
import { QuickStatus } from "@/components/contents/quick-status";
import { UrgencyBadge } from "@/components/shared/urgency-badge";
import { ContentActions } from "@/components/contents/content-actions";
import { corPrioridade } from "@/lib/ui/prioridade";
import { formatarData } from "@/lib/utils";
import { prazoPrincipal, urgenciaConteudo } from "@/lib/rules/contents";
import type { Content } from "@/types";

interface ContentCardProps {
  content: Content;
  /** Cor do cliente (bolinha). Opcional. */
  cor?: string | null;
  /** Nome do cliente (exibido quando informado). */
  clienteNome?: string;
}

/**
 * Card compacto de um conteúdo com ações por item: abrir, editar,
 * alterar status e alterar prioridade. Usado nas seções operacionais.
 */
export function ContentCard({ content, cor, clienteNome }: ContentCardProps) {
  const urg = urgenciaConteudo(content);
  return (
    <div
      className="rounded-lg border border-l-4 border-gray-200 bg-white p-3 shadow-sm"
      style={{ borderLeftColor: corPrioridade(content.priority) }}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/conteudos/${content.id}`}
          className="font-medium text-gray-900 hover:text-brand-700"
        >
          {content.title}
        </Link>
        <UrgencyBadge urgencia={urg} />
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
        {clienteNome ? (
          <Link
            href={`/clientes/${content.client_id}`}
            className="flex items-center gap-1 hover:text-brand-700 hover:underline"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full border border-gray-200"
              style={{ backgroundColor: cor ?? "#e5e7eb" }}
              aria-hidden="true"
            />
            {clienteNome}
          </Link>
        ) : null}
        <span>{content.format ?? "—"}</span>
        {content.planned_week ? <span>Semana {content.planned_week}</span> : null}
        <span>Prev.: {formatarData(content.planned_date)}</span>
        <span>Prazo: {formatarData(prazoPrincipal(content))}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <QuickStatus id={content.id} status={content.status} format={content.format} />
        <div className="ml-auto">
          <ContentActions id={content.id} status={content.status} compacto />
        </div>
      </div>
    </div>
  );
}
