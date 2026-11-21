import Link from "next/link";
import { AreaHeader } from "@/components/interno/area-header";
import { FinanceTabs } from "@/components/financeiro/finance-tabs";
import { GraficoCaixa } from "@/components/interno/grafico-caixa";
import { MonthNav } from "@/components/financeiro/month-nav";
import { Secao } from "@/components/interno/secao";
import { TabelaDoCaixa } from "@/components/financeiro/tabela-do-caixa";
import { obterSerieDeCaixa } from "@/lib/data/financeiro";
import { mesAtual, mesValido, rotuloMes, rotuloMesCurto } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Caixa" };

interface PageProps {
  searchParams: { mes?: string };
}

/**
 * Fluxo de caixa: o caixa mês a mês, do primeiro lançamento até o
 * último mês que tem alguma coisa.
 *
 * ESTA TELA ERA UMA CÓPIA DO PAINEL DO MÊS. As duas mostravam saldo
 * inicial, receitas e despesas por categoria e o fechamento. Quando o
 * Painel do mês virou a aba mensal da planilha, esta ficou repetindo
 * exatamente a mesma leitura numa aba diferente.
 *
 * A pergunta desta tela é outra, e é a que o nome dela promete: não
 * "como foi novembro", e sim "para onde o caixa está indo". Uma linha
 * por mês, com o saldo encadeado, e o que ainda está por vencer
 * separado do que já aconteceu.
 */
export default async function FluxoCaixaPage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes) ? searchParams.mes : mesAtual();

  const serie = await obterSerieDeCaixa(mes);
  const meses = serie.meses.map((m) => m.mes);
  const pontos = serie.meses
    .filter((m) => m.receitas > 0 || m.despesas > 0)
    .map((m) => ({ mes: m.mes, saldo: m.saldoFinal }));

  const ultimo = serie.meses[serie.meses.length - 1];
  const fechados = serie.meses.filter((m) => m.mes < mes);
  const melhor = fechados.reduce<(typeof fechados)[number] | null>(
    (m, x) => (m === null || x.resultado > m.resultado ? x : m),
    null,
  );
  const pior = fechados.reduce<(typeof fechados)[number] | null>(
    (m, x) => (m === null || x.resultado < m.resultado ? x : m),
    null,
  );

  return (
    <>
      <AreaHeader
        titulo="Fluxo de caixa mensal"
        acao={<MonthNav mes={mes} />}
      />

      <FinanceTabs />

      {/* Era "Para onde o caixa está indo", e na troca de linguagem eu
          renomeei para "Composição das despesas" — que está errado: o
          gráfico aqui é o SALDO encadeado mês a mês, não a divisão
          das despesas. Nome errado é pior que nome coloquial. */}
      <Secao titulo="Saldo acumulado">
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <GraficoCaixa pontos={pontos} meses={meses} />
        </div>
      </Secao>

      <Secao titulo="Movimentação mensal">
        <TabelaDoCaixa
          emFoco={mes}
          meses={serie.meses.map((m) => ({
            mes: m.mes,
            saldoInicial: m.saldoInicial,
            receitas: m.receitas,
            despesas: m.despesas,
            resultado: m.resultado,
            saldoFinal: m.saldoFinal,
            emAberto: m.aReceber + m.aPagar,
          }))}
        />
      </Secao>

      {melhor && pior && melhor.mes !== pior.mes ? (
        <Secao
          titulo="Melhor e pior resultado"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { r: "Melhor resultado", m: melhor },
              { r: "Pior resultado", m: pior },
            ].map(({ r, m }) => (
              <div
                key={r}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
              >
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-500">
                  {r}
                </p>
                <p className="mt-0.5 text-xl font-bold text-gray-900">
                  {rotuloMes(m.mes)}
                </p>
                <p
                  className={
                    "mt-0.5 text-sm font-semibold tabular-nums " +
                    (m.resultado < 0 ? "text-alerta" : "text-gray-600")
                  }
                >
                  {formatarMoeda(m.resultado)}
                </p>
              </div>
            ))}
          </div>
        </Secao>
      ) : null}

      <p className="text-sm text-gray-500">
        <Link
          href={`/interno/financeiro/resumo-anual?mes=${mes}`}
          className="font-medium text-brand-700 hover:underline"
        >
          Ver o ano por categoria
        </Link>
      </p>
    </>
  );
}
