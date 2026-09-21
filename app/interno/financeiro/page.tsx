import Link from "next/link";
import { AreaHeader } from "@/components/interno/area-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FinanceTabs } from "@/components/financeiro/finance-tabs";
import { MonthActions } from "@/components/financeiro/month-actions";
import { MonthNav } from "@/components/financeiro/month-nav";
import { MoneyStat } from "@/components/financeiro/money-stat";
import { contarRecorrenciasPendentes, obterPainelMes } from "@/lib/data/financeiro";
import { mesAtual, mesValido, rotuloMes } from "@/lib/financeiro/meses";
import { formatarData, formatarMoeda, formatarPercentual } from "@/lib/utils";
import { FINANCIAL_STATUS_TONE } from "@/types";
import type { TotalCategoria } from "@/lib/financeiro/calculo";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { mes?: string };
}

/** Barra proporcional ao maior valor da lista (leitura rápida do peso). */
function BarraCategoria({
  itens,
  cor,
}: {
  itens: TotalCategoria[];
  cor: "verde" | "vermelho";
}) {
  const maior = Math.max(...itens.map((i) => i.previsto), 1);
  const fundo = cor === "verde" ? "bg-green-500" : "bg-red-500";

  return (
    <ul className="space-y-3">
      {itens.map((item) => (
        <li key={item.categoriaId}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-gray-700">{item.nome}</span>
            <span className="shrink-0 font-medium text-gray-900">
              {formatarMoeda(item.realizado)}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full ${fundo}`}
              style={{ width: `${Math.max((item.realizado / maior) * 100, 1)}%` }}
            />
          </div>
          {item.pendente > 0 ? (
            <p className="mt-1 text-xs text-amber-600">
              + {formatarMoeda(item.pendente)} em aberto
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Painel do mês: a fotografia do caixa — quanto entrou, quanto saiu, o que
 * ainda falta receber/pagar e como o mês fecha.
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MoneyStat rotulo="Saldo inicial" valor={resumo.saldoInicial} tom="cinza" />
        <MoneyStat
          rotulo="Receitas recebidas"
          valor={resumo.receitas}
          tom="verde"
          detalhe={variacao}
        />
        <MoneyStat rotulo="Despesas pagas" valor={resumo.despesas} tom="vermelho" />
        <MoneyStat
          rotulo="Resultado do mês"
          valor={resumo.resultado}
          tom="indigo"
          colorirPeloSinal
          detalhe={`Margem ${formatarPercentual(resumo.margem)}`}
        />
        <MoneyStat
          rotulo="Saldo final"
          valor={resumo.saldoFinal}
          tom="azul"
          colorirPeloSinal
        />
        <MoneyStat
          rotulo="Projeção do mês"
          valor={resumo.saldoFinalPrevisto}
          tom="ambar"
          colorirPeloSinal
          detalhe="Se tudo que está em aberto se confirmar"
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

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Receitas por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {painel.receitasPorCategoria.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma receita lançada no mês.</p>
            ) : (
              <BarraCategoria itens={painel.receitasPorCategoria} cor="verde" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Despesas por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {painel.despesasPorCategoria.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma despesa lançada no mês.</p>
            ) : (
              <BarraCategoria itens={painel.despesasPorCategoria} cor="vermelho" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Faturamento por cliente</CardTitle>
          </CardHeader>
          <CardContent>
            {painel.porCliente.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma receita lançada no mês.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {painel.porCliente.slice(0, 10).map((c) => (
                  <li
                    key={c.clienteId ?? "sem-cliente"}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <span className="min-w-0 truncate text-sm text-gray-800">
                      {c.nome}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {c.pendente > 0 ? (
                        <Badge tom={FINANCIAL_STATUS_TONE.Pendente}>
                          {formatarMoeda(c.pendente)} em aberto
                        </Badge>
                      ) : null}
                      <span className="text-sm font-medium text-gray-900">
                        {formatarMoeda(c.total)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
