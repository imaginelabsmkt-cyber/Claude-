import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PriorityBadge } from "@/components/shared/status-badge";
import { QuickStatus } from "@/components/contents/quick-status";
import { QuickPriority } from "@/components/contents/quick-priority";
import { EmptyState } from "@/components/shared/empty-state";
import { formatarData } from "@/lib/utils";
import {
  proximaAcao,
  responsavelAtual,
  prazoPrincipal,
  estaAtrasado,
  motivoPrioridade,
} from "@/lib/rules/contents";
import { Badge } from "@/components/ui/badge";
import { ContentCard } from "@/components/contents/content-card";
import { indexarPerfis } from "@/lib/data/contents";
import type { Content, Profile } from "@/types";
import type { OpcaoCliente } from "@/lib/data/contents";

interface ContentsTableProps {
  contents: Content[];
  clientes: OpcaoCliente[];
  perfis: Profile[];
  /** Mensagem quando não há itens. */
  vazioTitulo?: string;
  vazioDescricao?: string;
}

/**
 * Tabela geral de conteúdos. As colunas derivadas (próxima ação,
 * responsável atual, prazo) vêm da camada central de regras — sem
 * duplicar lógica aqui.
 */
export function ContentsTable({
  contents,
  clientes,
  perfis,
  vazioTitulo = "Nenhum conteúdo encontrado",
  vazioDescricao = "Ajuste os filtros ou cadastre um novo conteúdo.",
}: ContentsTableProps) {
  if (contents.length === 0) {
    return <EmptyState titulo={vazioTitulo} descricao={vazioDescricao} />;
  }

  const clientesById = new Map(clientes.map((c) => [c.id, c]));
  const { porId, planner, producer } = indexarPerfis(perfis);

  return (
    <>
      {/* Celular: cards (evita rolagem horizontal excessiva) */}
      <div className="space-y-3 lg:hidden">
        {contents.map((c) => (
          <ContentCard
            key={c.id}
            content={c}
            clienteNome={clientesById.get(c.client_id)?.name ?? "—"}
            cor={clientesById.get(c.client_id)?.color}
          />
        ))}
      </div>

      {/* Desktop: tabela completa */}
      <Card className="hidden overflow-hidden lg:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-3 font-medium">Cliente</th>
              <th className="px-3 py-3 font-medium">Conteúdo</th>
              <th className="px-3 py-3 font-medium">Formato</th>
              <th className="px-3 py-3 font-medium">Semana</th>
              <th className="px-3 py-3 font-medium">Data prevista</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Prioridade</th>
              <th className="px-3 py-3 font-medium">Próxima ação</th>
              <th className="px-3 py-3 font-medium">Responsável</th>
              <th className="px-3 py-3 font-medium">Prazo</th>
              <th className="px-3 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contents.map((c) => {
              const cliente = clientesById.get(c.client_id);
              const publisherName = c.publisher_id
                ? (porId.get(c.publisher_id)?.name ?? null)
                : null;
              const responsavel = responsavelAtual(c, {
                planner,
                producer,
                publisherName,
              });
              const atrasado = estaAtrasado(c);
              const motivo = motivoPrioridade(c);
              return (
                <tr key={c.id} className="align-top hover:bg-gray-50">
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-2 text-gray-700">
                      <span
                        className="inline-block h-3 w-3 shrink-0 rounded-full border border-gray-200"
                        style={{ backgroundColor: cliente?.color ?? "#e5e7eb" }}
                        aria-hidden="true"
                      />
                      {cliente?.name ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/conteudos/${c.id}`}
                      className="font-medium text-gray-900 hover:text-brand-700"
                    >
                      {c.title}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-gray-600">{c.format ?? "—"}</td>
                  <td className="px-3 py-3 text-gray-600">
                    {c.planned_week ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {formatarData(c.planned_date)}
                  </td>
                  <td className="px-3 py-3">
                    <QuickStatus id={c.id} status={c.status} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1">
                      <QuickPriority id={c.id} priority={c.priority} />
                      <span className="text-[11px] text-gray-500">{motivo}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {proximaAcao(c.status)}
                  </td>
                  <td className="px-3 py-3 text-gray-600">{responsavel}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1">
                      <span
                        className={
                          atrasado ? "font-medium text-red-600" : "text-gray-600"
                        }
                      >
                        {formatarData(prazoPrincipal(c))}
                      </span>
                      {atrasado ? <Badge tom="vermelho">Atrasado</Badge> : null}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2 whitespace-nowrap">
                      <Link
                        href={`/conteudos/${c.id}`}
                        className="text-xs font-medium text-brand-700 hover:underline"
                      >
                        Abrir
                      </Link>
                      <Link
                        href={`/conteudos/${c.id}/editar`}
                        className="text-xs font-medium text-gray-500 hover:underline"
                      >
                        Editar
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </Card>
    </>
  );
}
