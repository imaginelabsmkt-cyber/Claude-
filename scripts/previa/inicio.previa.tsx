/**
 * Prévia visual do painel Início.
 *
 * Não é teste: não afirma nada. Renderiza os componentes de verdade com
 * os números de verdade e escreve um HTML para a gente abrir e OLHAR.
 * Layout (rótulo que colide, texto que some no celular, barra que
 * estoura, cor que briga com o papel) só se pega olhando.
 *
 * O markup dos cartões é copiado de `app/interno/page.tsx`. A página é
 * um componente de servidor que fala com o Supabase, então não dá para
 * renderizar ela aqui; o que importa, que é o desenho, é o mesmo.
 */
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { GraficoAno } from "@/components/interno/grafico-ano";
import { GraficoCaixa } from "@/components/interno/grafico-caixa";
import { Secao } from "@/components/interno/secao";
import { faturamentoAnual, type MesFaturamento } from "@/lib/interno/ano";
import { formatarMoeda } from "@/lib/utils";
import { mesesDoAno, rotuloMesCurto } from "@/lib/financeiro/meses";

/** Planilha da Favie, 05/11/2026. Saldo encadeado a partir de Abril. */
const REAIS: MesFaturamento[] = [
  { mes: "2026-04", receitas: 12150, despesas: 13890.12, receitasPrevistas: 12150, despesasPrevistas: 13890.12, saldoFinal: 14259.88 },
  { mes: "2026-05", receitas: 11800, despesas: 14102.44, receitasPrevistas: 11800, despesasPrevistas: 14102.44, saldoFinal: 11957.44 },
  { mes: "2026-06", receitas: 12450, despesas: 13540.9, receitasPrevistas: 12450, despesasPrevistas: 13540.9, saldoFinal: 10866.54 },
  { mes: "2026-07", receitas: 13150, despesas: 15239.8, receitasPrevistas: 13150, despesasPrevistas: 15239.8, saldoFinal: 8776.74 },
  { mes: "2026-08", receitas: 12900, despesas: 14534.8, receitasPrevistas: 12900, despesasPrevistas: 14534.8, saldoFinal: 7141.94 },
  { mes: "2026-09", receitas: 13150, despesas: 14166.04, receitasPrevistas: 13150, despesasPrevistas: 14166.04, saldoFinal: 6125.9 },
  { mes: "2026-10", receitas: 11350, despesas: 15837.74, receitasPrevistas: 13150, despesasPrevistas: 15837.74, saldoFinal: 1638.16 },
];

function Painel() {
  const ano = faturamentoAnual(2026, REAIS);
  const caixa = 11923.38;

  return (
    <>
      <Secao
        titulo={`O ano de ${ano.ano}`}
        explicacao="Quanto a Favie já faturou e como cada mês se comportou."
        acao={<span className="font-medium text-gray-600">Abrir o resumo do ano</span>}
      >
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Faturamento
              </p>
              <p className="mt-0.5 text-4xl font-bold tabular-nums tracking-tight text-gray-900 sm:text-5xl">
                {formatarMoeda(ano.recebido)}
              </p>
              <p className="mt-1 text-[13px] text-gray-500">
                em {ano.mesesFaturados} meses, média de{" "}
                <strong className="font-semibold text-gray-700">
                  {formatarMoeda(ano.mediaMensal)}
                </strong>{" "}
                por mês
              </p>
            </div>
            <dl className="flex flex-wrap gap-x-8 gap-y-3">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Saiu</dt>
                <dd className="mt-0.5 text-xl font-bold tabular-nums text-gray-900">{formatarMoeda(ano.pago)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Faltou</dt>
                <dd className="mt-0.5 text-xl font-bold tabular-nums text-alerta">
                  {formatarMoeda(Math.abs(ano.resultado))}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Melhor mês</dt>
                <dd className="mt-0.5 text-xl font-bold text-gray-900">
                  {rotuloMesCurto(ano.melhorMes!.mes)}
                  <span className="ml-1.5 text-sm font-semibold tabular-nums text-gray-500">
                    {formatarMoeda(ano.melhorMes!.valor)}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          <p className="mt-4 border-t border-gray-100 pt-3 text-sm text-gray-600">
            Ainda falta receber{" "}
            <strong className="font-semibold text-gray-900">{formatarMoeda(ano.aReceber)}</strong>{" "}
            de lançamentos já feitos. Se tudo entrar, o ano fecha em{" "}
            <strong className="font-semibold text-gray-900">{formatarMoeda(ano.previsto)}</strong>.
          </p>

          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="mb-1 text-sm font-semibold text-gray-700">Entrou e saiu, mês a mês</p>
            <p className="mb-3 text-[13px] text-gray-500">
              Cada mês tem duas colunas. Quando a vermelha passa da verde, aquele mês consumiu caixa.
            </p>
            <GraficoAno barras={ano.barras} mesFoco="2026-10" />
          </div>
        </div>
      </Secao>

      <Secao
        titulo="O caixa hoje"
        explicacao="Quanto tem agora, e até quando isso dura."
      >
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <p className="text-3xl font-bold tabular-nums tracking-tight text-gray-900">
            {formatarMoeda(caixa)}
          </p>
          <p className="mt-3 text-sm text-gray-600">
            Nos últimos meses saiu em média{" "}
            <strong className="font-semibold text-gray-900">{formatarMoeda(1788.1)}</strong> a mais
            do que entrou. Nesse ritmo, o caixa cobre a operação por{" "}
            <strong className="font-semibold text-gray-900">6 meses</strong>, até Maio/2027.
          </p>

          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="mb-1 text-sm font-semibold text-gray-700">O caixa ao longo do ano</p>
            <p className="mb-3 text-[13px] text-gray-500">
              Quanto sobrou no fim de cada mês. As colunas acima contam como foi cada mês; esta
              linha conta para onde isso está indo.
            </p>
            <GraficoCaixa pontos={ano.pontos} meses={mesesDoAno(ano.ano)} />
          </div>

          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border-l-4 border-alerta bg-alerta-soft py-2.5 pl-3 pr-3 text-sm text-gray-700">
            <span>
              As 7 mensalidades somam {formatarMoeda(13150)} e o custo fixo é{" "}
              {formatarMoeda(14272.32)}:{" "}
              <strong className="font-semibold text-alerta">
                faltam {formatarMoeda(1122.32)} por mês
              </strong>{" "}
              para a conta se pagar sozinha.
            </span>
            <span className="font-semibold text-alerta underline">Ver os clientes</span>
          </p>
        </div>
      </Secao>

      <Secao
        titulo="O mês de Outubro/2026"
        explicacao="Só o que já foi baixado neste mês. O que está em aberto aparece no bloco de cima."
        acao={<span className="font-medium text-gray-600">Abrir o financeiro</span>}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { r: "Entrou", v: formatarMoeda(11350), d: "2 ainda a receber" },
            { r: "Saiu", v: formatarMoeda(15837.74), d: "3 ainda a pagar" },
            { r: "Faltou", v: formatarMoeda(4487.74), d: "até agora" },
          ].map((x) => (
            <div key={x.r} className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-500">{x.r}</p>
              <p className="mt-0.5 text-xl font-bold tabular-nums text-gray-900">{x.v}</p>
              <p className="mt-0.5 text-xs text-gray-500">{x.d}</p>
            </div>
          ))}
        </div>
      </Secao>
    </>
  );
}

describe("prévia", () => {
  it("escreve o HTML do painel Início", () => {
    writeFileSync(
      process.env.SAIDA!,
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="app.css"></head>
<body data-area="inicio"><div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">${renderToStaticMarkup(
        <Painel />,
      )}</div></body></html>`,
    );
  });
});
