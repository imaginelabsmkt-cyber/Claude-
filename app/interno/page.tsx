import Link from "next/link";
import { AreaHeader } from "@/components/interno/area-header";
import { GraficoAno } from "@/components/interno/grafico-ano";
import { GraficoCaixa } from "@/components/interno/grafico-caixa";
import { OrigemItem, OrigemLista } from "@/components/interno/origem-item";
import { Secao } from "@/components/interno/secao";
import { MonthNav } from "@/components/financeiro/month-nav";
import { obterPainelInterno } from "@/lib/data/interno";
import {
  mesAtual,
  mesValido,
  mesesDoAno,
  rotuloMes,
  rotuloMesCurto,
} from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { mes?: string };
}

/**
 * Início: o ano em cima, o mês embaixo.
 *
 * A ordem da tela é a ordem das perguntas que a Fran faz, de fora para
 * dentro: como vai o ano, quanto tem em caixa hoje, o que precisa dela
 * agora, e por último como está o mês. Cada bloco tem título e uma
 * frase dizendo o que ele responde, porque um número sem nome é um
 * número que não vira decisão.
 */
export default async function InternoInicioPage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes) ? searchParams.mes : mesAtual();

  const painel = await obterPainelInterno(mes);
  const { financeiro, carteira, custoFixo, folego, ano } = painel;
  const caixa = financeiro.resumo.saldoFinal;
  const sobra = carteira.recorrente - custoFixo;

  return (
    <>
      <AreaHeader
        titulo="Início"
        contexto="O ano, o caixa e o que precisa de você"
        acao={<MonthNav mes={mes} />}
      />

      {/* 1. O ANO — o número que a Fran pediu para abrir a tela */}
      <Secao
        titulo={`O ano de ${ano.ano}`}
        explicacao="Quanto a Favie já faturou e como cada mês se comportou."
        acao={
          <Link
            href={`/interno/financeiro/resumo-anual?ano=${ano.ano}&mes=${mes}`}
            className="font-medium text-gray-600 hover:underline"
          >
            Abrir o resumo do ano
          </Link>
        }
      >
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5">
          <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Faturamento
              </p>
              <p className="mt-0.5 text-4xl font-bold tabular-nums tracking-tight text-gray-900 sm:text-5xl">
                {formatarMoeda(ano.recebido)}
              </p>
              <p className="mt-1 text-[13px] text-gray-500">
                {ano.mesesFaturados === 0 ? (
                  <>Nenhum mês faturado ainda neste ano.</>
                ) : (
                  <>
                    em {ano.mesesFaturados}{" "}
                    {ano.mesesFaturados === 1 ? "mês" : "meses"}, média de{" "}
                    <strong className="font-semibold text-gray-700">
                      {formatarMoeda(ano.mediaMensal)}
                    </strong>{" "}
                    por mês
                  </>
                )}
              </p>
            </div>

            <dl className="flex flex-wrap gap-x-8 gap-y-3">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Saiu
                </dt>
                <dd className="mt-0.5 text-xl font-bold tabular-nums text-gray-900">
                  {formatarMoeda(ano.pago)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  {ano.resultado >= 0 ? "Sobrou" : "Faltou"}
                </dt>
                <dd
                  className={
                    "mt-0.5 text-xl font-bold tabular-nums " +
                    (ano.resultado < 0 ? "text-alerta" : "text-gray-900")
                  }
                >
                  {formatarMoeda(Math.abs(ano.resultado))}
                </dd>
              </div>
              {ano.melhorMes ? (
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    Melhor mês
                  </dt>
                  <dd className="mt-0.5 text-xl font-bold text-gray-900">
                    {rotuloMesCurto(ano.melhorMes.mes)}
                    <span className="ml-1.5 text-sm font-semibold tabular-nums text-gray-500">
                      {formatarMoeda(ano.melhorMes.valor)}
                    </span>
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          {ano.aReceber > 0 ? (
            <p className="mt-4 border-t border-gray-100 pt-3 text-sm text-gray-600">
              Ainda falta receber{" "}
              <strong className="font-semibold text-gray-900">
                {formatarMoeda(ano.aReceber)}
              </strong>{" "}
              de lançamentos já feitos. Se tudo entrar, o ano fecha em{" "}
              <strong className="font-semibold text-gray-900">
                {formatarMoeda(ano.previsto)}
              </strong>
              .
            </p>
          ) : null}

          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="mb-1 text-sm font-semibold text-gray-700">
              Entrou e saiu, mês a mês
            </p>
            <p className="mb-3 text-[13px] text-gray-500">
              Cada mês tem duas colunas. Quando a vermelha passa da verde,
              aquele mês consumiu caixa.
            </p>
            <GraficoAno barras={ano.barras} mesFoco={mes} />
          </div>
        </div>
      </Secao>

      {/* 2. O CAIXA — quanto tem hoje e por quanto tempo dura */}
      <Secao
        titulo="O caixa hoje"
        explicacao="Quanto tem agora, e até quando isso dura."
      >
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5">
          <p
            className={
              "text-3xl font-bold tabular-nums tracking-tight " +
              (caixa < 0 ? "text-alerta" : "text-gray-900")
            }
          >
            {formatarMoeda(caixa)}
          </p>

          <p className="mt-3 text-sm text-gray-600">
            {folego.meses !== null && folego.ate ? (
              <>
                Nos últimos meses saiu em média{" "}
                <strong className="font-semibold text-gray-900">
                  {formatarMoeda(Math.abs(folego.mediaMensal))}
                </strong>{" "}
                a mais do que entrou. Nesse ritmo, o caixa cobre a operação por{" "}
                <strong className="font-semibold text-gray-900">
                  {folego.meses} {folego.meses === 1 ? "mês" : "meses"}
                </strong>
                , até {rotuloMes(folego.ate)}.
              </>
            ) : folego.mediaMensal > 0 ? (
              <>
                Nos últimos meses sobrou em média{" "}
                <strong className="font-semibold text-gray-900">
                  {formatarMoeda(folego.mediaMensal)}
                </strong>{" "}
                por mês. O caixa está crescendo.
              </>
            ) : (
              <>
                Ainda não há meses fechados suficientes para dizer quanto tempo
                o caixa aguenta. Depois de alguns meses lançados, este espaço
                responde isso.
              </>
            )}
          </p>

          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="mb-1 text-sm font-semibold text-gray-700">
              O caixa ao longo do ano
            </p>
            <p className="mb-3 text-[13px] text-gray-500">
              Quanto sobrou no fim de cada mês. As colunas acima contam
              como foi cada mês; esta linha conta para onde isso está indo.
            </p>
            <GraficoCaixa pontos={ano.pontos} meses={mesesDoAno(ano.ano)} />
          </div>

          {sobra < 0 ? (
            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border-l-4 border-alerta bg-alerta-soft py-2.5 pl-3 pr-3 text-sm text-gray-700">
              <span>
                As {carteira.ativos} mensalidades somam{" "}
                {formatarMoeda(carteira.recorrente)} e o custo fixo é{" "}
                {formatarMoeda(custoFixo)}:{" "}
                <strong className="font-semibold text-alerta">
                  faltam {formatarMoeda(Math.abs(sobra))} por mês
                </strong>{" "}
                para a conta se pagar sozinha.
              </span>
              <Link
                href="/interno/administrativo/clientes"
                className="font-semibold text-alerta underline"
              >
                Ver os clientes
              </Link>
            </p>
          ) : null}
        </div>
      </Secao>

      {/* 3. O QUE PEDE AÇÃO */}
      <Secao
        titulo="Precisa de você"
        explicacao={
          painel.urgentes > 0
            ? `Prazos deste mês. ${painel.urgentes} ${painel.urgentes === 1 ? "está vencendo ou venceu" : "estão vencendo ou venceram"}.`
            : "Tudo que tem prazo neste mês, do mais urgente para o menos."
        }
        acao={
          painel.compromissos.length > 10 ? (
            <Link
              href={`/interno/financeiro/lancamentos?mes=${mes}&situacao=aberto`}
              className="font-medium text-gray-600 hover:underline"
            >
              Ver todos os {painel.compromissos.length}
            </Link>
          ) : undefined
        }
      >
        {painel.compromissos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
            <p className="font-medium text-gray-900">
              Nada em aberto em {rotuloMes(mes)}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Tudo que tinha prazo neste mês já foi baixado.
            </p>
          </div>
        ) : (
          <OrigemLista>
            {painel.compromissos.slice(0, 10).map((c) => (
              <OrigemItem
                key={c.id}
                origem={c.origem}
                titulo={c.titulo}
                descricao={c.descricao}
                valor={c.valor > 0 ? formatarMoeda(c.valor) : undefined}
                prazo={c.prazo}
                atrasado={c.atrasado}
              />
            ))}
          </OrigemLista>
        )}
      </Secao>

      {/* 4. O MÊS — a leitura, depois da decisão */}
      <Secao
        titulo={`O mês de ${rotuloMes(mes)}`}
        explicacao="Só o que já foi baixado neste mês. O que está em aberto aparece no bloco de cima."
        acao={
          <Link
            href={`/interno/financeiro?mes=${mes}`}
            className="font-medium text-gray-600 hover:underline"
          >
            Abrir o financeiro
          </Link>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              r: "Entrou",
              v: formatarMoeda(financeiro.resumo.receitas),
              d: `${financeiro.aReceber.length} ainda a receber`,
            },
            {
              r: "Saiu",
              v: formatarMoeda(financeiro.resumo.despesas),
              d: `${financeiro.aPagar.length} ainda a pagar`,
            },
            {
              r: financeiro.resumo.resultado >= 0 ? "Sobrou" : "Faltou",
              v: formatarMoeda(Math.abs(financeiro.resumo.resultado)),
              d: "até agora",
            },
          ].map((x) => (
            <div
              key={x.r}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-500">
                {x.r}
              </p>
              <p className="mt-0.5 text-xl font-bold tabular-nums text-gray-900">
                {x.v}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">{x.d}</p>
            </div>
          ))}
        </div>
      </Secao>
    </>
  );
}
