import { AreaHeader } from "@/components/interno/area-header";
import { FinanceTabs } from "@/components/financeiro/finance-tabs";
import { GraficoCaixa } from "@/components/interno/grafico-caixa";
import { MonthNav } from "@/components/financeiro/month-nav";
import { Secao } from "@/components/interno/secao";
import { obterSerieDeCaixa } from "@/lib/data/financeiro";
import { mesAtual, mesValido, rotuloMes, rotuloMesCurto } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Fluxo de caixa" };

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
        contexto="O caixa mês a mês, do primeiro lançamento até hoje"
        acao={<MonthNav mes={mes} />}
      />

      <FinanceTabs />

      <Secao
        titulo="Para onde o caixa está indo"
      >
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <GraficoCaixa pontos={pontos} meses={meses} />
        </div>
      </Secao>

      <Secao
        titulo="Mês a mês"
      >
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-left font-bold">
                  Mês
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-bold">
                  Começou com
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-bold">
                  Entrou
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-bold">
                  Saiu
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-bold">
                  Sobrou
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-bold">
                  Terminou com
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {serie.meses.map((m) => {
                const vazio = m.receitas === 0 && m.despesas === 0;
                const emAberto = m.aReceber + m.aPagar;
                return (
                  <tr
                    key={m.mes}
                    className={
                      (m.mes === mes ? "bg-gray-50 " : "") +
                      (vazio ? "text-gray-400" : "")
                    }
                  >
                    <th
                      scope="row"
                      className={
                        "px-4 py-2.5 text-left font-medium " +
                        (m.mes === mes ? "text-gray-900" : "text-gray-700")
                      }
                    >
                      {rotuloMesCurto(m.mes)}
                      {emAberto > 0 ? (
                        <span className="ml-2 text-xs font-normal text-alerta">
                          {formatarMoeda(emAberto)} em aberto
                        </span>
                      ) : null}
                    </th>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">
                      {formatarMoeda(m.saldoInicial)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                      {vazio ? "" : formatarMoeda(m.receitas)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                      {vazio ? "" : formatarMoeda(m.despesas)}
                    </td>
                    <td
                      className={
                        "px-4 py-2.5 text-right font-semibold tabular-nums " +
                        (vazio
                          ? ""
                          : m.resultado < 0
                            ? "text-alerta"
                            : "text-gray-900")
                      }
                    >
                      {vazio ? "" : formatarMoeda(m.resultado)}
                    </td>
                    <td
                      className={
                        "px-4 py-2.5 text-right font-bold tabular-nums " +
                        (m.saldoFinal < 0 ? "text-alerta" : "text-gray-900")
                      }
                    >
                      {formatarMoeda(m.saldoFinal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {ultimo ? (
          <p className="mt-3 text-sm text-gray-600">
            O último mês da série é {rotuloMes(ultimo.mes)} e termina com{" "}
            <strong className="font-semibold text-gray-900">
              {formatarMoeda(ultimo.saldoFinal)}
            </strong>
            .
            {ultimo.saldoFinalPrevisto !== ultimo.saldoFinal ? (
              <>
                {" "}
                Com tudo que ainda está em aberto, fecharia em{" "}
                <strong className="font-semibold text-gray-900">
                  {formatarMoeda(ultimo.saldoFinalPrevisto)}
                </strong>
                .
              </>
            ) : null}
          </p>
        ) : null}
      </Secao>

      {melhor && pior && melhor.mes !== pior.mes ? (
        <Secao
          titulo="O melhor e o pior mês"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { r: "Sobrou mais em", m: melhor },
              { r: "Sobrou menos em", m: pior },
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
    </>
  );
}
