/**
 * Prévia visual do Painel do mês.
 *
 * Não é teste: não afirma nada. Monta a folha com os lançamentos de
 * novembro/2026 da planilha para a gente olhar se as duas colunas
 * ficam legíveis com o mês cheio.
 */
import { describe, it, vi } from "vitest";

// A folha do mês tem o botão de dar baixa, que é componente de cliente
// e chama `useRouter`. Fora do app o roteador não existe e o render
// estático quebra. Aqui ele vira um nada, porque a prévia é sobre o
// DESENHO, não sobre a navegação.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
  usePathname: () => "/interno/financeiro",
  useSearchParams: () => new URLSearchParams(),
}));
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { FolhaDoMes } from "@/components/financeiro/folha-do-mes";
import { Secao } from "@/components/interno/secao";
import type { LancamentoFolha } from "@/lib/financeiro/folha";
import { formatarMoeda, formatarPercentual } from "@/lib/utils";

const FERRAMENTAS = "Assinaturas e ferramentas digitais";

function r(
  description: string,
  amount: number,
  status: string,
  cliente: string,
): LancamentoFolha {
  return {
    id: "r-" + description,
    description,
    kind: "Receita",
    amount,
    status,
    due_date: "2026-11-10",
    categoria: "Mensalidades / clientes recorrentes",
    cliente,
  };
}

function d(
  description: string,
  amount: number,
  status: string,
  categoria: string,
  dia = 10,
): LancamentoFolha {
  return {
    id: "d-" + description,
    description,
    kind: "Despesa",
    amount,
    status,
    due_date: `2026-11-${String(dia).padStart(2, "0")}`,
    categoria,
    cliente: null,
  };
}

/** Aba Novembro/2026 da planilha, linha por linha. */
const MES: LancamentoFolha[] = [
  r("Mensalidade Studio Bambu", 1300, "Pendente", "Studio Bambu"),
  r("Mensalidade Dra. Hemilayne", 2000, "Pendente", "Dra. Hemilayne"),
  r("Mensalidade Kiku Sushi", 2200, "Pendente", "Kiku Sushi"),
  r("Mensalidade Laura Chioquetta", 1550, "Pago", "Laura Chioquetta"),
  r("Mensalidade Izabela Schipitoski", 1800, "Pago", "Izabela Schipitoski"),
  r("Mensalidade Malukies Cookies & Co", 2600, "Pendente", "Malukies Cookies & Co"),
  r("Mensalidade Natural Concept", 1700, "Pago", "Natural Concept"),
  d("Pró-labore Fran", 6500, "Pendente", "Pró-labore (sócias)", 5),
  d("Pró-labore Vitória", 6500, "Pendente", "Pró-labore (sócias)", 5),
  d("Claude Max", 454.1, "Pendente", FERRAMENTAS),
  d("ChatGPT Plus", 119.9, "Pendente", FERRAMENTAS),
  d("Adobe", 95, "Pendente", FERRAMENTAS),
  d("iCloud Fran", 66.9, "Pago", FERRAMENTAS),
  d("iCloud Vitória", 66.9, "Pago", FERRAMENTAS),
  d("Canva", 53, "Pago", FERRAMENTAS),
  d("Captions", 51.9, "Pendente", FERRAMENTAS),
  d("CapCut", 32.9, "Pago", FERRAMENTAS),
  d("Honorários da contabilidade", 159.9, "Pendente", "Contabilidade / MEI"),
  d("DAS do Simples Nacional", 86.05, "Pendente", "DAS - Simples Nacional", 20),
];

const SALDO_INICIAL = 11923.38;
const RECEITAS_PAGAS = 1550 + 1800 + 1700;
const DESPESAS_PAGAS = 66.9 + 66.9 + 53 + 32.9;
const A_RECEBER = 1300 + 2000 + 2200 + 2600;
const A_PAGAR = 6500 + 6500 + 454.1 + 119.9 + 95 + 51.9 + 159.9 + 86.05;

function Tela() {
  const resultado = RECEITAS_PAGAS - DESPESAS_PAGAS;
  const saldoFinal = SALDO_INICIAL + resultado;
  const previsto = saldoFinal + A_RECEBER - A_PAGAR;

  return (
    <>
      <Secao
        titulo="O mês de Novembro/2026"
      >
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
            {[
              ["Saldo no dia 1", formatarMoeda(SALDO_INICIAL), false, "text-xl"],
              ["Sobrou", formatarMoeda(resultado), false, "text-xl"],
              ["Saldo no fim", formatarMoeda(saldoFinal), false, "text-2xl"],
              [
                "Margem",
                formatarPercentual(resultado / RECEITAS_PAGAS),
                false,
                "text-xl",
              ],
            ].map(([rotulo, valor, alerta, tam]) => (
              <div key={String(rotulo)}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  {rotulo}
                </p>
                <p
                  className={`mt-0.5 ${tam} font-bold tabular-nums ${
                    alerta ? "text-alerta" : "text-gray-900"
                  }`}
                >
                  {valor}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-600">
            Ainda falta movimentar{" "}
            <strong className="font-semibold text-gray-900">
              {formatarMoeda(A_RECEBER + A_PAGAR)}
            </strong>
            . Se tudo se confirmar, fecha em{" "}
            <strong className="font-semibold text-gray-900">
              {formatarMoeda(previsto)}
            </strong>
            .
          </p>
        </div>
      </Secao>

      <Secao
        titulo="No que entrou e no que saiu"
      >
        <FolhaDoMes mes="2026-11" hoje="2026-11-09" lancamentos={MES} />
      </Secao>
    </>
  );
}

describe("prévia", () => {
  it("escreve o HTML do Painel do mês", () => {
    writeFileSync(
      process.env.SAIDA_MES!,
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="app.css"></head>
<body data-area="financeiro"><div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">${renderToStaticMarkup(
        <Tela />,
      )}</div></body></html>`,
    );
  });
});
