/**
 * Prévia visual do Fluxo de caixa.
 *
 * Não é teste: não afirma nada. Desenha a série mês a mês com os
 * números reais de 2026 para a gente olhar se a tabela e a linha ficam
 * legíveis com o ano inteiro na tela.
 */
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { GraficoCaixa } from "@/components/interno/grafico-caixa";
import { Secao } from "@/components/interno/secao";
import { rotuloMes, rotuloMesCurto } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";

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
  const ultimo = SERIE[SERIE.length - 1];

  return (
    <>
      <Secao
        titulo="Para onde o caixa está indo"
        explicacao="Cada ponto é o que sobrou no fim do mês, encadeado desde Abril/2026."
      >
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <GraficoCaixa pontos={pontos} meses={meses} />
        </div>
      </Secao>

      <Secao
        titulo="Mês a mês"
        explicacao="O saldo do fim de um mês é o saldo do começo do seguinte, como na planilha. Em vermelho, o mês que consumiu caixa."
      >
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
              <tr>
                <th className="px-4 py-2.5 text-left font-bold">Mês</th>
                <th className="px-4 py-2.5 text-right font-bold">Começou com</th>
                <th className="px-4 py-2.5 text-right font-bold">Entrou</th>
                <th className="px-4 py-2.5 text-right font-bold">Saiu</th>
                <th className="px-4 py-2.5 text-right font-bold">Sobrou</th>
                <th className="px-4 py-2.5 text-right font-bold">Terminou com</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {SERIE.map((m) => (
                <tr key={m.mes} className={m.mes === MES_FOCO ? "bg-gray-50" : ""}>
                  <th
                    scope="row"
                    className={
                      "px-4 py-2.5 text-left font-medium " +
                      (m.mes === MES_FOCO ? "text-gray-900" : "text-gray-700")
                    }
                  >
                    {rotuloMesCurto(m.mes)}
                    {m.emAberto > 0 ? (
                      <span className="ml-2 text-xs font-normal text-alerta">
                        {formatarMoeda(m.emAberto)} em aberto
                      </span>
                    ) : null}
                  </th>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">
                    {formatarMoeda(m.saldoInicial)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                    {formatarMoeda(m.receitas)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                    {formatarMoeda(m.despesas)}
                  </td>
                  <td
                    className={
                      "px-4 py-2.5 text-right font-semibold tabular-nums " +
                      (m.resultado < 0 ? "text-alerta" : "text-gray-900")
                    }
                  >
                    {formatarMoeda(m.resultado)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold tabular-nums text-gray-900">
                    {formatarMoeda(m.saldoFinal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-gray-600">
          O último mês da série é {rotuloMes(ultimo.mes)} e termina com{" "}
          <strong className="font-semibold text-gray-900">
            {formatarMoeda(ultimo.saldoFinal)}
          </strong>
          .
        </p>
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
