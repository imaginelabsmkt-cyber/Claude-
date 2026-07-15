import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { QuickStatus } from "@/components/contents/quick-status";
import { QuickPriority } from "@/components/contents/quick-priority";
import { ContentActions } from "@/components/contents/content-actions";
import { formatarData } from "@/lib/utils";
import { estaAtrasado, prazoPrincipal } from "@/lib/rules/contents";
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
  const atrasado = estaAtrasado(content);
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/conteudos/${content.id}`}
          className="font-medium text-gray-900 hover:text-brand-700"
        >
          {content.title}
        </Link>
        {atrasado ? <Badge tom="vermelho">Atrasado</Badge> : null}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
        {clienteNome ? (
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full border border-gray-200"
              style={{ backgroundColor: cor ?? "#e5e7eb" }}
              aria-hidden="true"
            />
            {clienteNome}
          </span>
        ) : null}
        <span>{content.format ?? "—"}</span>
        {content.planned_week ? <span>Semana {content.planned_week}</span> : null}
        <span>Prev.: {formatarData(content.planned_date)}</span>
        <span>Prazo: {formatarData(prazoPrincipal(content))}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <QuickStatus id={content.id} status={content.status} />
        <QuickPriority id={content.id} priority={content.priority} />
        <div className="ml-auto">
          <ContentActions id={content.id} status={content.status} compacto />
        </div>
      </div>
    </div>
  );
}
