import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuickStatus } from "@/components/contents/quick-status";
import { QuickPriority } from "@/components/contents/quick-priority";
import {
  getContent,
  listProfiles,
  indexarPerfis,
  listHistorico,
  listComentarios,
} from "@/lib/data/contents";
import { obterCliente } from "@/lib/data/clients";
import { getAuthContext } from "@/lib/auth";
import { HistoryTimeline } from "@/components/conteudos/history-timeline";
import { CommentsSection } from "@/components/conteudos/comments-section";
import { ContentActions } from "@/components/contents/content-actions";
import { ContentScriptPanel } from "@/components/contents/content-script-panel";
import { ProductionStages } from "@/components/contents/production-stages";
import {
  proximaAcao,
  responsavelAtual,
  prazoPrincipal,
  estaAtrasado,
  motivoPrioridade,
} from "@/lib/rules/contents";
import { formatarData } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

function Item({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{rotulo}</p>
      <div className="mt-1 text-sm text-gray-800">{children}</div>
    </div>
  );
}

/** Página individual do conteúdo. */
export default async function ConteudoPage({ params }: PageProps) {
  const conteudo = await getContent(params.id);
  if (!conteudo) notFound();

  const [cliente, perfis, historico, comentarios, ctx] = await Promise.all([
    obterCliente(conteudo.client_id),
    listProfiles(),
    listHistorico(conteudo.id),
    listComentarios(conteudo.id),
    getAuthContext(),
  ]);
  const { porId, planner, producer } = indexarPerfis(perfis);
  const nomePorId = new Map(perfis.map((p) => [p.id, p.name]));
  const comentariosView = comentarios.map((c) => ({
    ...c,
    autor: c.user_id ? (nomePorId.get(c.user_id) ?? "Usuário") : "Usuário",
  }));
  const nome = (id: string | null) => (id ? (porId.get(id)?.name ?? "—") : "—");
  const responsavel = responsavelAtual(conteudo, {
    planner,
    producer,
    publisherName: conteudo.publisher_id
      ? (porId.get(conteudo.publisher_id)?.name ?? null)
      : null,
  });

  return (
    <>
      <Link
        href="/conteudos"
        className="mb-4 inline-block text-sm text-brand-700 hover:underline"
      >
        ← Voltar para conteúdos
      </Link>

      <PageHeader
        titulo={conteudo.title}
        descricao={cliente?.name ?? undefined}
        acao={
          <ContentActions
            id={conteudo.id}
            status={conteudo.status}
            redirecionarAoExcluir={`/clientes/${conteudo.client_id}`}
          />
        }
      />

      {/* Resumo + ações rápidas */}
      <Card>
        <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Item rotulo="Status">
            <QuickStatus id={conteudo.id} status={conteudo.status} />
          </Item>
          <Item rotulo="Prioridade">
            <QuickPriority id={conteudo.id} priority={conteudo.priority} />
          </Item>
          <Item rotulo="Formato">{conteudo.format ?? "—"}</Item>
          <Item rotulo="Próxima ação">{proximaAcao(conteudo.status)}</Item>
          <Item rotulo="Responsável atual">{responsavel}</Item>
          <Item rotulo="Prazo principal">
            {formatarData(prazoPrincipal(conteudo))}
          </Item>
          <Item rotulo="Situação">
            {estaAtrasado(conteudo) ? (
              <Badge tom="vermelho">Atrasado</Badge>
            ) : (
              <Badge tom="verde">Em dia</Badge>
            )}
          </Item>
          <Item rotulo="Motivo da prioridade">
            {motivoPrioridade(conteudo)}
          </Item>
        </CardContent>
      </Card>

      {/* Planejamento */}
      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Planejamento</h2>
        <Card>
          <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Item rotulo="Mês de referência">
              {conteudo.reference_month ?? "—"}
            </Item>
            <Item rotulo="Semana prevista">{conteudo.planned_week ?? "—"}</Item>
            <Item rotulo="Data prevista">
              {formatarData(conteudo.planned_date)}
            </Item>
            <Item rotulo="Data real">
              {formatarData(conteudo.actual_post_date)}
            </Item>
            <Item rotulo="Pilar">{conteudo.content_pillar ?? "—"}</Item>
            <Item rotulo="Objetivo">{conteudo.objective ?? "—"}</Item>
            <div className="sm:col-span-3">
              <Item rotulo="Descrição">
                <span className="whitespace-pre-wrap">
                  {conteudo.description ?? "—"}
                </span>
              </Item>
            </div>
            <div className="flex gap-2 sm:col-span-3">
              {conteudo.is_fixed_date ? <Badge tom="roxo">Data fixa</Badge> : null}
              {conteudo.is_campaign ? <Badge tom="azul">Campanha</Badge> : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Responsáveis */}
      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">
          Responsáveis
        </h2>
        <Card>
          <CardContent className="grid grid-cols-2 gap-5 sm:grid-cols-5">
            <Item rotulo="Planejamento">{nome(conteudo.planner_id)}</Item>
            <Item rotulo="Gravação">{nome(conteudo.recorder_id)}</Item>
            <Item rotulo="Edição">{nome(conteudo.editor_id)}</Item>
            <Item rotulo="Postagem">{nome(conteudo.publisher_id)}</Item>
            <Item rotulo="Ajustes">{conteudo.revision_count}</Item>
          </CardContent>
        </Card>
      </div>

      {/* Produção por etapa (editável) */}
      <ProductionStages content={conteudo} />

      {/* Observações */}
      {conteudo.notes ? (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-gray-900">
            Observações
          </h2>
          <Card>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-gray-700">
                {conteudo.notes}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Roteiro, legenda e stories */}
      <ContentScriptPanel
        id={conteudo.id}
        script={conteudo.script}
        caption={conteudo.caption}
      />

      {/* Histórico e comentários */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            Histórico de alterações
          </h2>
          <Card>
            <CardContent>
              <HistoryTimeline itens={historico} nomePorId={nomePorId} />
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            Comentários
          </h2>
          <Card>
            <CardContent>
              <CommentsSection
                contentId={conteudo.id}
                comentarios={comentariosView}
                usuarioAtualId={ctx.user?.id ?? null}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
