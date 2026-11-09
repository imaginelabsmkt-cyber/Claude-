/**
 * Prévia visual da lista de Lançamentos.
 *
 * Não é teste: não afirma nada. A tabela de verdade é um componente de
 * cliente (tem botões e navegação), então o markup aqui é copiado dela.
 * O que importa, que é o desenho, é o mesmo.
 */
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import {
  ordenarPorUrgencia,
  situacaoDoLancamento,
  textoDoPrazo,
} from "@/lib/financeiro/vencimento";
import { clienteSeFizerFalta } from "@/lib/financeiro/nomes";
import { formatarMoeda } from "@/lib/utils";

const HOJE = "2026-11-09";

interface Linha {
  id: string;
  description: string;
  kind: "Receita" | "Despesa";
  amount: number;
  status: string;
  due_date: string | null;
  categoria: string;
  cliente: string | null;
}

const LANCAMENTOS: Linha[] = [
  { id: "1", description: "Pró-labore Fran", kind: "Despesa", amount: 6500, status: "Pendente", due_date: "2026-11-05", categoria: "Pró-labore (sócias)", cliente: null },
  { id: "2", description: "Pró-labore Vitória", kind: "Despesa", amount: 6500, status: "Pendente", due_date: "2026-11-05", categoria: "Pró-labore (sócias)", cliente: null },
  { id: "3", description: "Mensalidade Kiku Sushi", kind: "Receita", amount: 2200, status: "Pendente", due_date: "2026-11-09", categoria: "Mensalidades / clientes recorrentes", cliente: "Kiku Sushi" },
  { id: "4", description: "Claude Max", kind: "Despesa", amount: 454.1, status: "Pendente", due_date: "2026-11-10", categoria: "Assinaturas e ferramentas digitais", cliente: null },
  { id: "5", description: "Mensalidade Malukies Cookies & Co", kind: "Receita", amount: 2600, status: "Pendente", due_date: "2026-11-10", categoria: "Mensalidades / clientes recorrentes", cliente: "Malukies Cookies & Co" },
  { id: "6", description: "DAS do Simples Nacional", kind: "Despesa", amount: 86.05, status: "Pendente", due_date: "2026-11-20", categoria: "DAS - Simples Nacional", cliente: null },
  { id: "7", description: "Mensalidade Laura Chioquetta", kind: "Receita", amount: 1550, status: "Pago", due_date: "2026-11-08", categoria: "Mensalidades / clientes recorrentes", cliente: "Laura Chioquetta" },
  { id: "8", description: "Canva", kind: "Despesa", amount: 53, status: "Pago", due_date: "2026-11-02", categoria: "Assinaturas e ferramentas digitais", cliente: null },
];

const ATALHOS = ["Tudo", "Em aberto", "Vencidos", "Só o que entrou", "Só o que saiu"];

const acao =
  "rounded px-1.5 py-0.5 text-xs font-medium text-gray-500";

function Tela() {
  const lista = ordenarPorUrgencia(LANCAMENTOS, HOJE);
  const entrou = lista
    .filter((l) => l.kind === "Receita")
    .reduce((t, l) => t + l.amount, 0);
  const saiu = lista
    .filter((l) => l.kind === "Despesa")
    .reduce((t, l) => t + l.amount, 0);

  const corDoPrazo = (l: Linha) => {
    const s = situacaoDoLancamento(l, HOJE);
    if (s === "Vencido" || s === "Vence hoje") return "text-alerta font-semibold";
    if (s === "Pago") return "text-gray-400";
    return "text-gray-500";
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">
          Novo lançamento
        </span>
        <span className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800">
          Gerar do plano fixo (3)
        </span>
      </div>

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {ATALHOS.map((a, i) => (
            <span
              key={a}
              className={
                "rounded-full border px-3 py-1.5 text-sm font-medium " +
                (i === 0
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-gray-300 bg-white text-gray-700")
              }
            >
              {a}
            </span>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="flex gap-2">
            <span className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-400">
              Procurar pelo nome...
            </span>
            <span className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800">
              Ir
            </span>
          </div>
          <span className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
            Todas as categorias
          </span>
          <span className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
            Todos os clientes
          </span>
        </div>
      </div>

      <p className="mb-3 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm text-gray-600">
        <span>{lista.length} lançamentos</span>
        <span>
          entrou{" "}
          <strong className="font-semibold tabular-nums text-gray-900">
            {formatarMoeda(entrou)}
          </strong>
        </span>
        <span>
          saiu{" "}
          <strong className="font-semibold tabular-nums text-gray-900">
            {formatarMoeda(saiu)}
          </strong>
        </span>
        <span>
          diferença{" "}
          <strong className="font-semibold tabular-nums text-alerta">
            {formatarMoeda(entrou - saiu)}
          </strong>
        </span>
      </p>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
            <tr>
              <th className="px-4 py-2.5 font-bold">Lançamento</th>
              <th className="px-4 py-2.5 font-bold">Categoria</th>
              <th className="px-4 py-2.5 text-right font-bold">Valor</th>
              <th className="px-4 py-2.5 font-bold">Prazo</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lista.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2.5">
                  <span className="font-medium text-gray-900">{l.description}</span>
                  {clienteSeFizerFalta(l.description, l.cliente) ? (
                    <span className="block text-xs text-gray-500">{l.cliente}</span>
                  ) : null}
                </td>
                <td className="px-4 py-2.5 text-gray-600">{l.categoria}</td>
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-gray-900">
                  {l.kind === "Receita" ? "+" : "-"} {formatarMoeda(l.amount)}
                </td>
                <td className={"px-4 py-2.5 " + corDoPrazo(l)}>
                  {textoDoPrazo(l, HOJE)}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end">
                    <span className="flex shrink-0 items-center gap-0.5">
                      <span
                        className={
                          l.status === "Pago"
                            ? acao
                            : "rounded border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-800"
                        }
                      >
                        {l.status === "Pago" ? "Reabrir" : "Dar baixa"}
                      </span>
                      <span className={acao}>Editar</span>
                      <span className={acao}>Excluir</span>
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

describe("prévia", () => {
  it("escreve o HTML dos Lançamentos", () => {
    writeFileSync(
      process.env.SAIDA_LANCAMENTOS!,
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="app.css"></head>
<body data-area="financeiro"><div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">${renderToStaticMarkup(
        <Tela />,
      )}</div></body></html>`,
    );
  });
});
