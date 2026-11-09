import Link from "next/link";
import { AreaHeader } from "@/components/interno/area-header";
import { OrigemItem, OrigemLista } from "@/components/interno/origem-item";
import { MonthNav } from "@/components/financeiro/month-nav";
import { obterPainelInterno } from "@/lib/data/interno";
import { mesAtual, mesValido, rotuloMes } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { mes?: string };
}

/**
 * Início: por onde começar hoje.
 *
 * A tela abre com UM número grande, não com quatro do mesmo tamanho.
 * Quatro indicadores iguais empurram para quem lê a decisão de qual
 * importa; um número grande já responde. Embaixo dele, uma frase que
 * diz o que aquele número significa, porque "R$ 11.923" não é uma
 * decisão e "o caixa cobre a operação até maio" é.
 *
 * Depois vem o que PEDE AÇÃO, e só então a leitura. É a ordem que os
 * painéis financeiros bons usam: decisão antes de dado.
 */
export default async function InternoInicioPage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes) ? searchParams.mes : mesAtual();

  const painel = await obterPainelInterno(mes);
  const { financeiro, carteira, custoFixo, folego } = painel;
  const caixa = financeiro.resumo.saldoFinal;
  const sobra = carteira.recorrente - custoFixo;

  return (
    <>
      <AreaHeader
        titulo="Início"
        contexto={rotuloMes(mes)}
        acao={<MonthNav mes={mes} />}
      />

      {/* O número que decide */}
      <section className="mb-6 rounded-2xl border border-gray-200 bg-white px-5 py-6">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
          Em caixa
        </p>
        <p
          className={
            "mt-1 text-4xl font-bold tabular-nums tracking-tight sm:text-5xl " +
            (caixa < 0 ? "text-alerta" : "text-gray-900")
          }
        >
          {formatarMoeda(caixa)}
        </p>

        <p className="mt-4 border-t border-gray-100 pt-4 text-sm text-gray-600">
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
              Ainda não há meses fechados suficientes para dizer quanto tempo o
              caixa aguenta. Depois de alguns meses lançados, este espaço
              responde isso.
            </>
          )}
        </p>
      </section>

      {sobra < 0 ? (
        <p className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-l-4 border-alerta bg-alerta-soft py-2.5 pl-3 pr-3 text-sm text-gray-700">
          <span>
            As {carteira.ativos} mensalidades somam{" "}
            {formatarMoeda(carteira.recorrente)} e o fixo é{" "}
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

      {/* O que pede ação */}
      <div className="mb-2 flex items-baseline gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
          Precisa de você
        </h2>
        {painel.urgentes > 0 ? (
          <span className="text-xs font-semibold text-alerta">
            {painel.urgentes} vencendo ou vencido
          </span>
        ) : null}
      </div>

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

      {painel.compromissos.length > 10 ? (
        <Link
          href={`/interno/financeiro/lancamentos?mes=${mes}&status=Pendente`}
          className="mt-3 inline-block text-sm font-medium text-gray-600 hover:underline"
        >
          Ver todos os {painel.compromissos.length} em aberto
        </Link>
      ) : null}

      {/* A leitura, depois da decisão */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          {
            r: "Entrou no mês",
            v: formatarMoeda(financeiro.resumo.receitas),
            d: `${financeiro.aReceber.length} ainda a receber`,
          },
          {
            r: "Saiu no mês",
            v: formatarMoeda(financeiro.resumo.despesas),
            d: `${financeiro.aPagar.length} ainda a pagar`,
          },
          {
            r: financeiro.resumo.resultado >= 0 ? "Sobrou" : "Faltou",
            v: formatarMoeda(Math.abs(financeiro.resumo.resultado)),
            d: "no mês até agora",
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
    </>
  );
}
