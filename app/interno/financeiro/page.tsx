import Link from "next/link";
import { AreaHeader } from "@/components/interno/area-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FinanceTabs } from "@/components/financeiro/finance-tabs";
import { MonthActions } from "@/components/financeiro/month-actions";
import { MonthNav } from "@/components/financeiro/month-nav";
import { MoneyStat } from "@/components/financeiro/money-stat";
import { contarRecorrenciasPendentes, obterPainelMes } from "@/lib/data/financeiro";
import { mesAtual, mesValido, rotuloMes } from "@/lib/financeiro/meses";
import { formatarData, formatarMoeda, formatarPercentual } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { mes?: string };
}

/**
 * Painel do mês: a fotografia do caixa — quanto entrou, quanto saiu, o que
 * ainda falta receber/pagar e como o mês fecha.
 *
 * Quatro números e duas listas, de propósito. A quebra por categoria vive
 * no Fluxo de caixa (com os lançamentos dentro de cada uma) e a visão por
 * cliente vive na Rentabilidade — repetir aqui só faria a tela crescer sem
 * dizer nada novo.
 */
export default async function FinanceiroPage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes) ? searchParams.mes : mesAtual();

  const [painel, recorrenciasPendentes] = await Promise.all([
    obterPainelMes(mes),
    contarRecorrenciasPendentes(mes),
  ]);
  const { resumo, anterior } = painel;

  const variacao =
    painel.variacaoReceita != null
      ? `${painel.variacaoReceita >= 0 ? "+" : ""}${formatarPercentual(painel.variacaoReceita)} vs. mês anterior`
      : anterior
        ? "sem receita no mês anterior"
        : undefined;

  const projecao =
    resumo.saldoFinalPrevisto !== resumo.saldoFinal
      ? `${formatarMoeda(resumo.saldoFinalPrevisto)} se tudo em aberto se confirmar`
      : undefined;

  return (
    <>
      <AreaHeader
        titulo="Financeiro"
        contexto={rotuloMes(mes)}
        acao={<MonthNav mes={mes} />}
      />

      <FinanceTabs />

      <div className="mb-6">
        <MonthActions mes={mes} recorrenciasPendentes={recorrenciasPendentes} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MoneyStat
          rotulo="Entrou"
          valor={resumo.receitas}
          tom="verde"
          detalhe={variacao}
        />
        <MoneyStat rotulo="Saiu" valor={resumo.despesas} tom="vermelho" />
        <MoneyStat
          rotulo="Sobrou no mês"
          valor={resumo.resultado}
          tom="indigo"
          colorirPeloSinal
        />
        <MoneyStat
          rotulo="Em caixa no fim"
          valor={resumo.saldoFinal}
          tom="azul"
          colorirPeloSinal
          detalhe={projecao}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>A receber em {rotuloMes(mes)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-2xl font-bold text-amber-600">
              {formatarMoeda(resumo.aReceber)}
            </p>
            {painel.aReceber.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nada em aberto — todas as receitas do mês já entraram.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {painel.aReceber.slice(0, 8).map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-gray-800">{l.description}</p>
                      <p className="text-xs text-gray-500">
                        {l.client?.name ?? l.category?.name ?? "—"} · venc.{" "}
                        {formatarData(l.due_date)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-gray-900">
                      {formatarMoeda(Number(l.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {painel.aReceber.length > 8 ? (
              <Link
                href={`/interno/financeiro/lancamentos?mes=${mes}&tipo=Receita&status=Pendente`}
                className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline"
              >
                Ver todos os {painel.aReceber.length} lançamentos
              </Link>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>A pagar em {rotuloMes(mes)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-2xl font-bold text-red-600">
              {formatarMoeda(resumo.aPagar)}
            </p>
            {painel.aPagar.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma conta em aberto no mês.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {painel.aPagar.slice(0, 8).map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-gray-800">{l.description}</p>
                      <p className="text-xs text-gray-500">
                        {l.category?.name ?? "—"} · venc. {formatarData(l.due_date)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-gray-900">
                      {formatarMoeda(Number(l.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {painel.aPagar.length > 8 ? (
              <Link
                href={`/interno/financeiro/lancamentos?mes=${mes}&tipo=Despesa&status=Pendente`}
                className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline"
              >
                Ver todos os {painel.aPagar.length} lançamentos
              </Link>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500">
        <Link
          href={`/interno/financeiro/fluxo-caixa?mes=${mes}`}
          className="font-medium text-brand-700 hover:underline"
        >
          Ver por categoria →
        </Link>
        <Link
          href={`/interno/comercial/rentabilidade?mes=${mes}`}
          className="font-medium text-brand-700 hover:underline"
        >
          Ver por cliente →
        </Link>
      </p>
    </>
  );
}
