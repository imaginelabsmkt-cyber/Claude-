import { AreaHeader } from "@/components/interno/area-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FinanceTabs } from "@/components/financeiro/finance-tabs";
import { MonthNav } from "@/components/financeiro/month-nav";
import { obterPainelMes } from "@/lib/data/financeiro";
import { mesAtual, mesValido, rotuloMes } from "@/lib/financeiro/meses";
import { formatarMoeda, formatarPercentual } from "@/lib/utils";
import { FINANCIAL_STATUS_TONE } from "@/types";
import type { FinancialEntryWithRelations } from "@/types";
import type { TotalCategoria } from "@/lib/financeiro/calculo";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { mes?: string };
}

/**
 * Fluxo de caixa do mês no formato da planilha: saldo inicial no topo,
 * receitas e despesas agrupadas por categoria (com os lançamentos dentro)
 * e o fechamento embaixo. É a tela para conferir o mês linha a linha.
 */
export default async function FluxoCaixaPage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes) ? searchParams.mes : mesAtual();

  const painel = await obterPainelMes(mes);
  const { resumo } = painel;

  const porCategoria = (
    grupos: TotalCategoria[],
    lancamentos: FinancialEntryWithRelations[],
  ) =>
    grupos.map((grupo) => ({
      grupo,
      itens: lancamentos.filter((l) => l.category_id === grupo.categoriaId),
    }));

  const receitas = porCategoria(
    painel.receitasPorCategoria,
    painel.lancamentos.filter((l) => l.kind === "Receita"),
  );
  const despesas = porCategoria(
    painel.despesasPorCategoria,
    painel.lancamentos.filter((l) => l.kind === "Despesa"),
  );

  const secao = (
    titulo: string,
    blocos: { grupo: TotalCategoria; itens: FinancialEntryWithRelations[] }[],
    total: number,
    pendente: number,
    cor: "verde" | "vermelho",
  ) => {
    const corTexto = cor === "verde" ? "text-green-700" : "text-red-600";
    const corFundo = cor === "verde" ? "bg-green-50" : "bg-red-50";

    return (
      <Card className="overflow-hidden">
        <div className={`flex items-center justify-between px-4 py-3 ${corFundo}`}>
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">
            {titulo}
          </h2>
          <div className="text-right">
            <p className={`text-lg font-bold ${corTexto}`}>{formatarMoeda(total)}</p>
            {pendente > 0 ? (
              <p className="text-xs text-amber-600">
                {formatarMoeda(pendente)} em aberto
              </p>
            ) : null}
          </div>
        </div>

        {blocos.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">
            Nenhum lançamento nesta seção.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {blocos.map(({ grupo, itens }) => (
              <div key={grupo.categoriaId} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-semibold text-gray-800">{grupo.nome}</h3>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatarMoeda(grupo.realizado)}
                  </span>
                </div>

                <ul className="mt-2 space-y-1">
                  {itens.map((l) => (
                    <li
                      key={l.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-gray-600">{l.description}</span>
                        {l.status === "Pendente" ? (
                          <Badge tom={FINANCIAL_STATUS_TONE.Pendente}>Pendente</Badge>
                        ) : null}
                      </span>
                      <span
                        className={
                          "shrink-0 tabular-nums " +
                          (l.status === "Pago" ? "text-gray-800" : "text-amber-600")
                        }
                      >
                        {formatarMoeda(Number(l.amount))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  };

  return (
    <>
      <AreaHeader
        titulo="Fluxo de caixa"
        contexto={rotuloMes(mes)}
        acao={<MonthNav mes={mes} />}
      />

      <FinanceTabs />

      <Card className="mb-4 flex items-center justify-between p-4">
        <span className="text-sm font-medium text-gray-600">
          Saldo inicial do mês
        </span>
        <span className="text-lg font-bold text-gray-900">
          {formatarMoeda(resumo.saldoInicial)}
        </span>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {secao("💰 Receitas", receitas, resumo.receitas, resumo.aReceber, "verde")}
        {secao("📤 Despesas", despesas, resumo.despesas, resumo.aPagar, "vermelho")}
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="bg-gray-50 px-4 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">
            📊 Resultado do mês
          </h2>
        </div>
        <dl className="divide-y divide-gray-100">
          {[
            {
              rotulo: "Resultado líquido (receitas − despesas)",
              valor: resumo.resultado,
              destaque: true,
            },
            { rotulo: "Saldo final do mês", valor: resumo.saldoFinal, destaque: true },
            {
              rotulo: "Saldo projetado (com pendências)",
              valor: resumo.saldoFinalPrevisto,
              destaque: false,
            },
          ].map((linha) => (
            <div
              key={linha.rotulo}
              className="flex items-center justify-between px-4 py-3"
            >
              <dt className="text-sm text-gray-600">{linha.rotulo}</dt>
              <dd
                className={
                  (linha.destaque ? "text-lg font-bold " : "text-base font-semibold ") +
                  (linha.valor >= 0 ? "text-green-700" : "text-red-600")
                }
              >
                {formatarMoeda(linha.valor)}
              </dd>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3">
            <dt className="text-sm text-gray-600">Margem líquida</dt>
            <dd className="text-base font-semibold text-gray-900">
              {formatarPercentual(resumo.margem)}
            </dd>
          </div>
        </dl>
      </Card>
    </>
  );
}
