import { AreaHeader } from "@/components/interno/area-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EntriesTable } from "@/components/financeiro/entries-table";
import { EntriesToolbar } from "@/components/financeiro/entries-toolbar";
import { FinanceTabs } from "@/components/financeiro/finance-tabs";
import { MonthActions } from "@/components/financeiro/month-actions";
import { MonthNav } from "@/components/financeiro/month-nav";
import {
  contarRecorrenciasPendentes,
  listarCategorias,
  listarClientesFinanceiro,
  listarLancamentos,
} from "@/lib/data/financeiro";
import { somar } from "@/lib/financeiro/calculo";
import {
  contarUrgentes,
  ordenarPorUrgencia,
  situacaoDoLancamento,
} from "@/lib/financeiro/vencimento";
import { mesAtual, mesValido, rotuloMes } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";
import type { FinancialKind, FinancialStatus } from "@/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Lançamentos" };

interface PageProps {
  searchParams: {
    mes?: string;
    tipo?: string;
    status?: string;
    situacao?: string;
    categoria?: string;
    cliente?: string;
    q?: string;
  };
}

/**
 * Lançamentos: a lista de TRABALHO do financeiro.
 *
 * A diferença entre esta tela e o Painel do mês é a pergunta. O painel
 * responde "como foi o mês" e por isso agrupa por categoria. Esta
 * responde "o que eu preciso resolver", e por isso a ordem é a
 * urgência: vencido primeiro, depois o que vence hoje, depois o que vai
 * vencer, e por último o que já foi baixado.
 */
export default async function LancamentosPage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes) ? searchParams.mes : mesAtual();

  const tipo =
    searchParams.tipo === "Receita" || searchParams.tipo === "Despesa"
      ? (searchParams.tipo as FinancialKind)
      : undefined;
  // "situacao" é o atalho da barra: aberto, vencido ou pago. O "status"
  // antigo continua funcionando, porque links velhos apontam para ele.
  const situacao = searchParams.situacao;
  const status: FinancialStatus | undefined =
    situacao === "pago"
      ? "Pago"
      : situacao === "aberto" || situacao === "vencido"
        ? "Pendente"
        : searchParams.status === "Pago" || searchParams.status === "Pendente"
          ? (searchParams.status as FinancialStatus)
          : undefined;

  const hoje = new Date().toISOString().slice(0, 10);

  const [brutos, categorias, clientes, recorrenciasPendentes] = await Promise.all([
    listarLancamentos({
      mes,
      kind: tipo,
      status,
      categoriaId: searchParams.categoria,
      clienteId: searchParams.cliente,
      q: searchParams.q,
    }),
    listarCategorias(),
    listarClientesFinanceiro(),
    contarRecorrenciasPendentes(mes),
  ]);

  const noRecorte =
    situacao === "vencido"
      ? brutos.filter((l) => situacaoDoLancamento(l, hoje) === "Vencido")
      : brutos;
  const lancamentos = ordenarPorUrgencia(noRecorte, hoje);
  const urgentes = contarUrgentes(lancamentos, hoje);

  const receitas = somar(
    lancamentos.filter((l) => l.kind === "Receita").map((l) => Number(l.amount)),
  );
  const despesas = somar(
    lancamentos.filter((l) => l.kind === "Despesa").map((l) => Number(l.amount)),
  );

  const temFiltro = Boolean(
    tipo ||
      status ||
      situacao ||
      searchParams.categoria ||
      searchParams.cliente ||
      searchParams.q,
  );

  return (
    <>
      <AreaHeader
        contexto={
          urgentes > 0
            ? `${urgentes} ${urgentes === 1 ? "lançamento vencido ou vencendo hoje" : "lançamentos vencidos ou vencendo hoje"}`
            : "Tudo que entrou e saiu, linha por linha"
        }
        acao={<MonthNav mes={mes} />}
      />

      <FinanceTabs />

      <div className="mb-4">
        <MonthActions mes={mes} recorrenciasPendentes={recorrenciasPendentes} />
      </div>

      <EntriesToolbar categorias={categorias} clientes={clientes} />

      {lancamentos.length === 0 ? (
        <EmptyState
          titulo={
            temFiltro
              ? "Nenhum lançamento encontrado"
              : `Nenhum lançamento em ${rotuloMes(mes)}`
          }
          descricao={
            temFiltro
              ? "Ajuste os filtros para ver outros resultados."
              : "Comece gerando os lançamentos do plano fixo ou criando um lançamento novo."
          }
        />
      ) : (
        <>
          {/* A soma é do RECORTE, não do mês: com filtro ligado ela é a
              única coisa na tela que diz quanto dá o que está à vista. */}
          <p className="mb-3 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm text-gray-600">
            <span>
              {lancamentos.length}{" "}
              {lancamentos.length === 1 ? "lançamento" : "lançamentos"}
              {temFiltro ? " no filtro" : ""}
            </span>
            <span>
              entrou{" "}
              <strong className="font-semibold tabular-nums text-gray-900">
                {formatarMoeda(receitas)}
              </strong>
            </span>
            <span>
              saiu{" "}
              <strong className="font-semibold tabular-nums text-gray-900">
                {formatarMoeda(despesas)}
              </strong>
            </span>
            <span>
              diferença{" "}
              <strong
                className={
                  "font-semibold tabular-nums " +
                  (receitas - despesas < 0 ? "text-alerta" : "text-gray-900")
                }
              >
                {formatarMoeda(receitas - despesas)}
              </strong>
            </span>
          </p>

          <EntriesTable lancamentos={lancamentos} hoje={hoje} />
        </>
      )}
    </>
  );
}
