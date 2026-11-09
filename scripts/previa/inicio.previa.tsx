/**
 * Prévia visual do Dashboard.
 *
 * Não é teste: não afirma nada. O markup é copiado de
 * `app/interno/page.tsx`, que é um componente de servidor e fala com o
 * Supabase, então não dá para renderizar a página aqui.
 *
 * ATENÇÃO: isto é uma cópia, e cópia envelhece. Já aconteceu de a
 * prévia me mostrar a tela antiga enquanto a de verdade já tinha
 * mudado. Ao mexer na página, mexa aqui também, ou apague a prévia.
 */
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { GraficoAno } from "@/components/interno/grafico-ano";
import { GraficoCaixa } from "@/components/interno/grafico-caixa";
import { MetaDoAnoCartao } from "@/components/interno/meta-do-ano";
import { metaDoAno } from "@/lib/interno/meta";
import { OrigemItem, OrigemLista } from "@/components/interno/origem-item";
import { Secao } from "@/components/interno/secao";
import { faturamentoAnual, type MesFaturamento } from "@/lib/interno/ano";
import { mesesDoAno, rotuloMes, rotuloMesCurto } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";

const MES = "2026-10";

const REAIS: MesFaturamento[] = [
  { mes: "2026-04", receitas: 12150, despesas: 13890.12, receitasPrevistas: 12150, despesasPrevistas: 13890.12, saldoFinal: 14259.88 },
  { mes: "2026-05", receitas: 11800, despesas: 14102.44, receitasPrevistas: 11800, despesasPrevistas: 14102.44, saldoFinal: 11957.44 },
  { mes: "2026-06", receitas: 12450, despesas: 13540.9, receitasPrevistas: 12450, despesasPrevistas: 13540.9, saldoFinal: 10866.54 },
  { mes: "2026-07", receitas: 13150, despesas: 15239.8, receitasPrevistas: 13150, despesasPrevistas: 15239.8, saldoFinal: 8776.74 },
  { mes: "2026-08", receitas: 12900, despesas: 14534.8, receitasPrevistas: 12900, despesasPrevistas: 14534.8, saldoFinal: 7141.94 },
  { mes: "2026-09", receitas: 13150, despesas: 14166.04, receitasPrevistas: 13150, despesasPrevistas: 14166.04, saldoFinal: 6125.9 },
  { mes: "2026-10", receitas: 11350, despesas: 15837.74, receitasPrevistas: 13150, despesasPrevistas: 15837.74, saldoFinal: 1638.16 },
];

/** Igual ao <Indicador> da página. */
function Indicador({
  rotulo,
  valor,
  detalhe,
  alerta,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  alerta?: boolean;
}) {
  return (
    <span
      className={
        "block rounded-2xl border bg-white px-4 py-3 shadow-sm " +
        (alerta ? "border-alerta" : "border-gray-200")
      }
    >
      <span className="block text-[10.5px] font-semibold uppercase tracking-wider text-gray-500">
        {rotulo}
      </span>
      <span
        className={
          "mt-0.5 block text-xl font-bold tabular-nums " +
          (alerta ? "text-alerta" : "text-gray-900")
        }
      >
        {valor}
      </span>
      {detalhe ? (
        <span className="mt-0.5 block text-xs text-gray-500">{detalhe}</span>
      ) : null}
    </span>
  );
}

function Tela() {
  const ano = faturamentoAnual(2026, REAIS);

  return (
    <>
      <Secao
        titulo={`O ano de ${ano.ano}`}
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
                {ano.mesesFaturados} meses, média de{" "}
                <strong className="font-semibold text-gray-700">
                  {formatarMoeda(ano.mediaMensal)}
                </strong>
              </p>
            </div>
            <dl className="flex flex-wrap gap-x-8 gap-y-3">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Saiu</dt>
                <dd className="mt-0.5 text-xl font-bold tabular-nums text-gray-900">
                  {formatarMoeda(ano.pago)}
                </dd>
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

          <div className="mt-5 border-t border-gray-100 pt-4">
            <MetaDoAnoCartao
              meta={metaDoAno(180000, ano.recebido, ano.ano, "2026-11")!}
            />
          </div>

          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="mb-2 text-sm font-semibold text-gray-700">
              O caixa no fim de cada mês
            </p>
            <GraficoCaixa pontos={ano.pontos} meses={mesesDoAno(ano.ano)} />
          </div>

          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="mb-2 text-sm font-semibold text-gray-700">
              Entrou e saiu, mês a mês
            </p>
            <GraficoAno barras={ano.barras} mesFoco={MES} />
          </div>
        </div>
      </Secao>

      <Secao titulo={rotuloMes(MES)}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Indicador
            rotulo="Em caixa"
            valor={formatarMoeda(1638.16)}
            detalhe="cobre até Maio/2027"
          />
          <Indicador
            rotulo="Vencido a receber"
            valor={formatarMoeda(1800)}
            detalhe="2 em aberto no mês"
            alerta
          />
          <Indicador
            rotulo="Vencido a pagar"
            valor={formatarMoeda(13000)}
            detalhe="3 em aberto no mês"
            alerta
          />
          <Indicador
            rotulo="No funil"
            valor={formatarMoeda(5400)}
            detalhe="3 oportunidades"
          />
          <Indicador rotulo="Contratos" valor="2" detalhe="pedem conversa" alerta />
        </div>

        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border-l-4 border-alerta bg-alerta-soft py-2.5 pl-3 pr-3 text-sm text-gray-700">
          <span>
            <strong className="font-semibold text-alerta">
              Faltam {formatarMoeda(1036.55)} por mês
            </strong>{" "}
            para as mensalidades cobrirem o custo fixo.
          </span>
          <span className="font-semibold text-alerta underline">Ver o funil</span>
        </p>
      </Secao>

      <Secao titulo="Precisa de você">
        <OrigemLista>
          <OrigemItem
            origem="financeiro"
            titulo="Pró-labore Fran"
            descricao="Pró-labore (sócias)"
            valor={formatarMoeda(6500)}
            prazo="venceu há 4 dias"
            atrasado
          />
          <OrigemItem
            origem="comercial"
            titulo="Renovar contrato: Studio Bambu"
            descricao="contrato vai até 2026-12"
            valor={formatarMoeda(1300)}
            prazo="em 2 meses"
          />
          <OrigemItem
            origem="administrativo"
            titulo="Enviar relatório para a Dra. Hemilayne"
            descricao="Clientes"
            prazo="dia 30"
          />
        </OrigemLista>
      </Secao>
    </>
  );
}

describe("prévia", () => {
  it("escreve o HTML do Dashboard", () => {
    writeFileSync(
      process.env.SAIDA!,
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="app.css"></head>
<body data-area="inicio"><div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">${renderToStaticMarkup(
        <Tela />,
      )}</div></body></html>`,
    );
  });
});
