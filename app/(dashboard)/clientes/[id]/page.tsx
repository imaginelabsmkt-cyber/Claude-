import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActiveToggle } from "@/components/clients/active-toggle";
import { ClientContentsByMonth } from "@/components/clients/client-contents-by-month";
import {
  ContentWeekBoard,
  type DiaSemana,
  type ItemCalendario,
} from "@/components/contents/content-week-board";
import { DeletePlanningButton } from "@/components/contents/delete-planning-button";
import { ClientSectionTabs } from "@/components/clients/client-section-tabs";
import { ClientFilesTab } from "@/components/clients/client-files-tab";
import { ClientOnboarding } from "@/components/clients/client-onboarding";
import { ClientReportsTab } from "@/components/clients/client-reports-tab";
import { ClientDiagnosticsTab } from "@/components/clients/client-diagnostics-tab";
import { obterCliente } from "@/lib/data/clients";
import { listContents, listProfiles } from "@/lib/data/contents";
import { listClientFiles } from "@/lib/data/client-files";
import {
  getOnboarding,
  listClientReports,
  listClientDiagnostics,
} from "@/lib/data/client-onboarding";
import { resumoProducao, inicioDaSemana, hojeISO } from "@/lib/rules/contents";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
  searchParams: { semana?: string };
}

const NOMES_DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Indicador compacto do mês. */
function Stat({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: ReactNode;
  destaque?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline gap-2 rounded-lg border px-3 py-1.5",
        destaque ? "border-brand-200 bg-brand-50" : "border-gray-200 bg-white",
      )}
    >
      <span className="text-[11px] uppercase tracking-wide text-gray-500">
        {rotulo}
      </span>
      <span className="text-sm font-bold text-gray-900">{valor}</span>
    </div>
  );
}

/** Painel operacional do cliente. */
export default async function ClientePage({ params, searchParams }: PageProps) {
  const cliente = await obterCliente(params.id);
  if (!cliente) notFound();

  const [todos, perfis, arquivos, onboarding, relatorios, diagnosticos] =
    await Promise.all([
      listContents(
        { client_id: cliente.id },
        { incluirClientesInativos: true, excluirCapas: true }, // capa não é conteúdo
      ),
      listProfiles(),
      listClientFiles(cliente.id),
      getOnboarding(cliente.id),
      listClientReports(cliente.id),
      listClientDiagnostics(cliente.id),
    ]);

  const hoje = new Date();

  // Semana exibida (?semana=YYYY-MM-DD, qualquer dia da semana). Padrão: hoje.
  const base = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.semana ?? "")
    ? new Date(`${searchParams.semana}T12:00:00`)
    : hoje;
  const inicioSemana = inicioDaSemana(base);
  const meioSemana = addDays(inicioSemana, 3); // referência do mês

  // Mês (para a meta contratual e para apagar planejamento)
  const mes = `${meioSemana.getFullYear()}-${String(meioSemana.getMonth() + 1).padStart(2, "0")}`;
  const doMes = todos.filter((c) => c.reference_month === mes);
  const resumo = resumoProducao(doMes);
  const planejados = doMes.filter((c) => c.status !== "Cancelado").length;

  // Dias da semana exibida
  const dias: DiaSemana[] = NOMES_DIAS.map((nome, i) => {
    const data = addDays(inicioSemana, i);
    const iso = hojeISO(data);
    return {
      iso,
      diaSemana: nome,
      numero: data.getDate(),
      hoje: iso === hojeISO(hoje),
    };
  });

  const itensCalendario: ItemCalendario[] = todos
    .filter((c) => c.planned_date)
    .map((c) => ({
      id: c.id,
      title: c.title,
      format: c.format,
      iso: c.planned_date!,
    }));

  const fim = addDays(inicioSemana, 6);
  const fmtDia = (d: Date) =>
    new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" }).format(
      d,
    );
  const tituloSemana = `${fmtDia(inicioSemana)} – ${fmtDia(fim)}`;
  const tituloMes = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(meioSemana);

  const semanaHref = (delta: number) =>
    `/clientes/${cliente.id}?semana=${hojeISO(addDays(inicioSemana, delta * 7))}`;

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
          cliente.niche ? `Nicho: ${cliente.niche}` : "Painel operacional"
        }
        icone="clientes"
        tom="verde"
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

      {/* Acompanhamento semanal */}
      <ContentWeekBoard
        titulo={tituloSemana}
        dias={dias}
        itens={itensCalendario}
        hrefAnterior={semanaHref(-1)}
        hrefProximo={semanaHref(1)}
        hrefHoje={`/clientes/${cliente.id}`}
      />

      {/* Resumo compacto do mês + ação de apagar planejamento */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Stat
            rotulo={`Meta ${tituloMes}`}
            destaque
            valor={
              cliente.monthly_goal != null
                ? `${planejados}/${cliente.monthly_goal}`
                : planejados
            }
          />
          <Stat rotulo="A gravar" valor={resumo.aguardandoGravacao} />
          <Stat rotulo="Em edição" valor={resumo.filaEdicao + resumo.emEdicao} />
          <Stat rotulo="Aprovação" valor={resumo.emAprovacao} />
          <Stat rotulo="Publicados" valor={resumo.publicados} />
        </div>
        <DeletePlanningButton
          clientId={cliente.id}
          mes={mes}
          quantidade={doMes.length}
          rotuloMes={tituloMes}
        />
      </div>

      {/* Abas do cliente: abre sempre em Conteúdos (uso do dia a dia). */}
      <ClientSectionTabs
        padrao="conteudos"
        abas={[
          {
            id: "onboard",
            label: "Onboard",
            icone: "sparkles",
            conteudo: (
              <ClientOnboarding clientId={cliente.id} inicial={onboarding} />
            ),
          },
          {
            id: "conteudos",
            label: "Conteúdos",
            icone: "list",
            badge: todos.length,
            conteudo: (
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-gray-400">
                    Edite qualquer campo direto na linha, salva sozinho. Clique
                    no título para abrir. O que não foi feito segue no mês atual.
                  </span>
                </div>
                <ClientContentsByMonth
                  contents={todos}
                  clientes={clienteOpt}
                  perfis={perfis}
                  vazioDescricao="Este cliente ainda não tem conteúdos cadastrados."
                  acaoVazio={
                    <div className="flex flex-wrap justify-center gap-2">
                      <Link href="/conteudos/importar">
                        <Button variante="secundaria">
                          Importar planejamento
                        </Button>
                      </Link>
                      <Link href="/conteudos/novo">
                        <Button>+ Novo conteúdo</Button>
                      </Link>
                    </div>
                  }
                />
              </div>
            ),
          },
          {
            id: "arquivos",
            label: "Arquivos",
            icone: "folder",
            badge: arquivos.length,
            conteudo: (
              <ClientFilesTab clientId={cliente.id} arquivos={arquivos} />
            ),
          },
          {
            id: "diagnostico",
            label: "Diagnóstico",
            icone: "chart",
            badge: diagnosticos.length,
            conteudo: (
              <ClientDiagnosticsTab
                clientId={cliente.id}
                diagnosticos={diagnosticos}
              />
            ),
          },
          {
            id: "relatorios",
            label: "Relatórios",
            icone: "report",
            badge: relatorios.length,
            conteudo: (
              <ClientReportsTab
                clientId={cliente.id}
                relatorios={relatorios}
              />
            ),
          },
        ]}
      />
    </>
  );
}
