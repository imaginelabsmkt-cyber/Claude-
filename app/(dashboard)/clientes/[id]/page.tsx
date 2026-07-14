import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActiveToggle } from "@/components/clients/active-toggle";
import { ContentCard } from "@/components/contents/content-card";
import { ContentsTable } from "@/components/contents/contents-table";
import { PanelFilters } from "@/components/contents/panel-filters";
import { obterCliente } from "@/lib/data/clients";
import { listContents, listProfiles } from "@/lib/data/contents";
import {
  resumoProducao,
  GRUPO_EM_APROVACAO,
  GRUPO_PRONTOS_PUBLICAR,
} from "@/lib/rules/contents";
import type { Content, ContentStatus } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
  searchParams: {
    reference_month?: string;
    status?: string;
    format?: string;
    planned_week?: string;
  };
}

function Kpi({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-gray-500">{rotulo}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{valor}</p>
      </CardContent>
    </Card>
  );
}

function Secao({
  titulo,
  itens,
  cor,
}: {
  titulo: string;
  itens: Content[];
  cor?: string | null;
}) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
        {titulo}
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {itens.length}
        </span>
      </h3>
      {itens.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-xs text-gray-400">
          Nenhum conteúdo aqui.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {itens.map((c) => (
            <ContentCard key={c.id} content={c} cor={cor} />
          ))}
        </div>
      )}
    </section>
  );
}

/** Painel operacional do cliente. */
export default async function ClientePage({ params, searchParams }: PageProps) {
  const cliente = await obterCliente(params.id);
  if (!cliente) notFound();

  const [todos, perfis] = await Promise.all([
    listContents({ client_id: cliente.id }),
    listProfiles(),
  ]);

  // Meses disponíveis (do próprio cliente)
  const meses = Array.from(
    new Set(
      todos
        .map((c) => c.reference_month)
        .filter((m): m is string => Boolean(m)),
    ),
  )
    .sort()
    .reverse();

  const mesSel = searchParams.reference_month || meses[0] || "";
  const doMes = mesSel
    ? todos.filter((c) => c.reference_month === mesSel)
    : todos;

  const resumo = resumoProducao(doMes);
  const planejados = doMes.filter((c) => c.status !== "Cancelado").length;

  const porStatus = (lista: ContentStatus[]) =>
    doMes.filter((c) => lista.includes(c.status));

  // Tabela completa: aplica os filtros ativos sobre todos os conteúdos.
  const filtrada = todos.filter((c) => {
    if (searchParams.reference_month && c.reference_month !== searchParams.reference_month)
      return false;
    if (searchParams.status && c.status !== searchParams.status) return false;
    if (searchParams.format && c.format !== searchParams.format) return false;
    if (
      searchParams.planned_week &&
      String(c.planned_week ?? "") !== searchParams.planned_week
    )
      return false;
    return true;
  });

  const clienteOpt = [
    { id: cliente.id, name: cliente.name, color: cliente.color },
  ];

  return (
    <>
      <Link
        href="/clientes"
        className="mb-4 inline-block text-sm text-brand-700 hover:underline"
      >
        ← Voltar para clientes
      </Link>

      <PageHeader
        titulo={cliente.name}
        descricao={
          cliente.posting_frequency
            ? `Frequência: ${cliente.posting_frequency}`
            : "Painel operacional"
        }
        acao={
          <div className="flex items-center gap-2">
            {cliente.active ? (
              <Badge tom="verde">Ativo</Badge>
            ) : (
              <Badge tom="cinza">Inativo</Badge>
            )}
            <Link href={`/clientes/${cliente.id}/editar`}>
              <Button variante="secundaria">Editar</Button>
            </Link>
            <ActiveToggle id={cliente.id} ativo={cliente.active} />
          </div>
        }
      />

      {/* Filtros */}
      <div className="mb-5">
        <PanelFilters meses={meses} />
        {mesSel ? (
          <p className="mt-2 text-xs text-gray-500">
            Indicadores e seções referentes ao mês <strong>{mesSel}</strong>.
          </p>
        ) : null}
      </div>

      {/* Cards de indicadores */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi rotulo="Total planejado no mês" valor={planejados} />
        <Kpi rotulo="Aguardando gravação" valor={resumo.aguardandoGravacao} />
        <Kpi rotulo="Gravados" valor={resumo.gravados} />
        <Kpi rotulo="Fila de edição" valor={resumo.filaEdicao} />
        <Kpi rotulo="Em edição" valor={resumo.emEdicao} />
        <Kpi rotulo="Em aprovação" valor={resumo.emAprovacao} />
        <Kpi rotulo="Aprovados" valor={resumo.aprovados} />
        <Kpi rotulo="Publicados" valor={resumo.publicados} />
      </div>

      {/* Seções operacionais */}
      <div className="mt-8 space-y-8">
        <Secao
          titulo="Falta gravar"
          cor={cliente.color}
          itens={porStatus(["Aguardando gravação"])}
        />
        <Secao
          titulo="Já gravados"
          cor={cliente.color}
          itens={porStatus(["Gravado"])}
        />
        <Secao
          titulo="Fila de edição"
          cor={cliente.color}
          itens={porStatus(["Fila de edição", "Em edição", "Ajustes"])}
        />
        <Secao
          titulo="Em aprovação"
          cor={cliente.color}
          itens={porStatus(GRUPO_EM_APROVACAO)}
        />
        <Secao
          titulo="Prontos para publicar"
          cor={cliente.color}
          itens={porStatus(GRUPO_PRONTOS_PUBLICAR)}
        />
        <Secao
          titulo="Publicados no mês"
          cor={cliente.color}
          itens={porStatus(["Publicado"])}
        />
      </div>

      {/* Tabela completa */}
      <div className="mt-10">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Todos os conteúdos do cliente
        </h2>
        <ContentsTable
          contents={filtrada}
          clientes={clienteOpt}
          perfis={perfis}
          vazioTitulo="Nenhum conteúdo"
          vazioDescricao="Este cliente ainda não tem conteúdos com os filtros atuais."
        />
      </div>
    </>
  );
}
