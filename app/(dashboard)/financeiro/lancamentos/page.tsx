import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
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
import { mesAtual, mesValido, rotuloMes } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";
import type { FinancialKind, FinancialStatus } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: {
    mes?: string;
    tipo?: string;
    status?: string;
    categoria?: string;
    cliente?: string;
    q?: string;
  };
}

/** Listagem de lançamentos do mês, com filtros e baixa rápida. */
export default async function LancamentosPage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes) ? searchParams.mes : mesAtual();

  const tipo =
    searchParams.tipo === "Receita" || searchParams.tipo === "Despesa"
      ? (searchParams.tipo as FinancialKind)
      : undefined;
  const status =
    searchParams.status === "Pago" || searchParams.status === "Pendente"
      ? (searchParams.status as FinancialStatus)
      : undefined;

  const [lancamentos, categorias, clientes, recorrenciasPendentes] = await Promise.all([
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

  const receitas = somar(
    lancamentos.filter((l) => l.kind === "Receita").map((l) => Number(l.amount)),
  );
  const despesas = somar(
    lancamentos.filter((l) => l.kind === "Despesa").map((l) => Number(l.amount)),
  );

  const temFiltro = Boolean(
    tipo || status || searchParams.categoria || searchParams.cliente || searchParams.q,
  );

  return (
    <>
      <PageHeader
        titulo="Lançamentos"
        descricao={`Entradas e saídas de ${rotuloMes(mes)}`}
        icone="financeiro"
        tom="verde"
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
              : "Comece gerando os lançamentos do plano fixo, copiando o mês anterior ou criando um lançamento novo."
          }
        />
      ) : (
        <>
          <Card className="mb-4 p-4">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
              <span className="text-gray-500">
                {lancamentos.length} lançamento(s) no recorte
              </span>
              <span className="text-gray-700">
                Receitas:{" "}
                <strong className="text-green-700">{formatarMoeda(receitas)}</strong>
              </span>
              <span className="text-gray-700">
                Despesas:{" "}
                <strong className="text-red-600">{formatarMoeda(despesas)}</strong>
              </span>
              <span className="text-gray-700">
                Diferença:{" "}
                <strong
                  className={
                    receitas - despesas >= 0 ? "text-green-700" : "text-red-600"
                  }
                >
                  {formatarMoeda(receitas - despesas)}
                </strong>
              </span>
            </div>
          </Card>

          <EntriesTable lancamentos={lancamentos} />
        </>
      )}
    </>
  );
}
