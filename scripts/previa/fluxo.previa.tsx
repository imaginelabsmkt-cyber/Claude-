/**
 * Prévia visual do Fluxo de caixa.
 *
 * Não é teste: não afirma nada. Desenha a série mês a mês com os
 * números reais de 2026 para a gente olhar se a tabela e a linha ficam
 * legíveis com o ano inteiro na tela.
 *
 * A TABELA É O COMPONENTE DE VERDADE (`TabelaDoCaixa`), não uma cópia
 * do markup. A cópia que estava aqui envelheceu: mostrava os nomes
 * antigos das colunas enquanto a página já tinha os novos.
 */
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { GraficoCaixa } from "@/components/interno/grafico-caixa";
import { TabelaDoCaixa } from "@/components/financeiro/tabela-do-caixa";
import { Secao } from "@/components/interno/secao";

interface MesSerie {
  mes: string;
  saldoInicial: number;
  receitas: number;
  despesas: number;
  resultado: number;
  saldoFinal: number;
  emAberto: number;
}

/** Planilha da Favie: abril a novembro de 2026, saldo encadeado. */
const CRU: [string, number, number][] = [
  ["2026-04", 15271, 11548.03],
  ["2026-05", 20958, 16224.11],
  ["2026-06", 20418, 14767.16],
  ["2026-07", 18747, 15567.02],
  ["2026-08", 15500, 15900.22],
  ["2026-09", 15650, 17813.92],
  ["2026-10", 14150, 16950.16],
  ["2026-11", 5050, 219.7],
];

const EM_ABERTO: Record<string, number> = { "2026-11": 22066.85 };

const SERIE: MesSerie[] = [];
let saldo = 0;
for (const [mes, receitas, despesas] of CRU) {
  const resultado = receitas - despesas;
  SERIE.push({
    mes,
    saldoInicial: saldo,
    receitas,
    despesas,
    resultado,
    saldoFinal: saldo + resultado,
    emAberto: EM_ABERTO[mes] ?? 0,
  });
  saldo += resultado;
}

const MES_FOCO = "2026-11";

function Tela() {
  const meses = SERIE.map((m) => m.mes);
  const pontos = SERIE.map((m) => ({ mes: m.mes, saldo: m.saldoFinal }));

  return (
    <>
      <Secao
        titulo="Saldo acumulado"
      >
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <GraficoCaixa pontos={pontos} meses={meses} />
        </div>
      </Secao>

      <Secao titulo="Movimentação mensal">
        <TabelaDoCaixa meses={SERIE} emFoco={MES_FOCO} />
      </Secao>
    </>
  );
}

describe("prévia", () => {
  it("escreve o HTML do Fluxo de caixa", () => {
    writeFileSync(
      process.env.SAIDA_FLUXO!,
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="app.css"></head>
<body data-area="financeiro"><div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">${renderToStaticMarkup(
        <Tela />,
      )}</div></body></html>`,
    );
  });
});
