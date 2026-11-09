/**
 * Prévia visual do gráfico do ano.
 *
 * Não é teste: não afirma nada. Renderiza o componente de verdade com
 * os números de verdade e escreve um HTML para a gente abrir e olhar.
 * Layout (rótulo que colide, texto que some no celular, barra que
 * estoura) só se pega olhando.
 */
import { describe, it } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { GraficoAno } from "@/components/interno/grafico-ano";
import { faturamentoAnual } from "@/lib/interno/ano";

const REAIS = [
  { mes: "2026-04", receitas: 12150, despesas: 13890.12, receitasPrevistas: 12150, despesasPrevistas: 13890.12 },
  { mes: "2026-05", receitas: 11800, despesas: 14102.44, receitasPrevistas: 11800, despesasPrevistas: 14102.44 },
  { mes: "2026-06", receitas: 12450, despesas: 13540.9, receitasPrevistas: 12450, despesasPrevistas: 13540.9 },
  { mes: "2026-07", receitas: 13150, despesas: 15239.8, receitasPrevistas: 13150, despesasPrevistas: 15239.8 },
  { mes: "2026-08", receitas: 12900, despesas: 14534.8, receitasPrevistas: 12900, despesasPrevistas: 14534.8 },
  { mes: "2026-09", receitas: 13150, despesas: 14166.04, receitasPrevistas: 13150, despesasPrevistas: 14166.04 },
  { mes: "2026-10", receitas: 11350, despesas: 15837.74, receitasPrevistas: 13150, despesasPrevistas: 15837.74 },
];

describe("prévia", () => {
  it("escreve o HTML do gráfico do ano", () => {
    const ano = faturamentoAnual(2026, REAIS);
    const svg = renderToStaticMarkup(
      h(GraficoAno, { barras: ano.barras, mesFoco: "2026-10" }),
    );
    const vazio = renderToStaticMarkup(
      h(GraficoAno, { barras: faturamentoAnual(2027, []).barras }),
    );
    writeFileSync(
      process.env.SAIDA!,
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<link rel="stylesheet" href="app.css">
</head><body class="bg-gray-50 p-6" data-area="inicio">
<div class="mx-auto max-w-4xl space-y-6">
  <div class="rounded-2xl border border-gray-200 bg-white px-5 py-5">
    <p class="text-[11px] font-bold uppercase tracking-wider text-gray-500">Faturamento de 2026</p>
    <p class="mt-0.5 text-4xl font-bold tabular-nums tracking-tight text-gray-900 sm:text-5xl">R$&nbsp;86.950,00</p>
    <p class="mt-1 text-[13px] text-gray-500">em 7 meses, m&eacute;dia de <strong class="font-semibold text-gray-700">R$&nbsp;12.421,43</strong> por m&ecirc;s</p>
    <div class="mt-5 border-t border-gray-100 pt-4">
      <p class="mb-1 text-sm font-semibold text-gray-700">Entrou e saiu, m&ecirc;s a m&ecirc;s</p>
      <p class="mb-3 text-[13px] text-gray-500">Cada m&ecirc;s tem duas colunas. Quando a vermelha passa da verde, aquele m&ecirc;s consumiu caixa.</p>
      ${svg}
    </div>
  </div>
  <div class="rounded-2xl border border-gray-200 bg-white px-5 py-5">${vazio}</div>
</div>
</body></html>`,
    );
  });
});
