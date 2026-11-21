/**
 * Prévia visual da lista de Lançamentos.
 *
 * Não é teste: não afirma nada.
 *
 * DESENHA O COMPONENTE DE VERDADE. A versão anterior copiava o markup
 * da tabela "porque é componente de cliente", e a cópia mentiu: ela me
 * mostrou uma tabela de três colunas espremida em 390px, quando a
 * tela real já tinha a lista de celular. Componente de cliente
 * renderiza estático igual — só precisa do roteador fingido.
 */
import { describe, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
  usePathname: () => "/interno/financeiro/lancamentos",
  useSearchParams: () => new URLSearchParams(),
}));

import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { ordenarPorUrgencia } from "@/lib/financeiro/vencimento";
import { EntriesTable } from "@/components/financeiro/entries-table";
import type { FinancialEntryWithRelations } from "@/types";
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

const ATALHOS = ["Tudo", "Em aberto", "Em atraso", "Só receitas", "Só despesas"];

/** Os mesmos lançamentos, no formato que o componente lê. */
const PARA_TABELA = LANCAMENTOS.map(
  (l) =>
    ({
      id: l.id,
      reference_month: "2026-11",
      kind: l.kind,
      category_id: "c",
      client_id: l.cliente ? "k" : null,
      description: l.description,
      amount: l.amount,
      status: l.status,
      due_date: l.due_date,
      paid_date: null,
      payment_method: null,
      notes: null,
      recurrence_id: null,
      team_member_id: null,
      created_at: "2026-11-01T00:00:00Z",
      updated_at: "2026-11-01T00:00:00Z",
      category: { id: "c", name: l.categoria, kind: l.kind, sort_order: 0 },
      client: l.cliente ? { id: "k", name: l.cliente } : null,
    }) as unknown as FinancialEntryWithRelations,
);

function Tela() {
  const lista = ordenarPorUrgencia(LANCAMENTOS, HOJE);
  const entrou = lista
    .filter((l) => l.kind === "Receita")
    .reduce((t, l) => t + l.amount, 0);
  const saiu = lista
    .filter((l) => l.kind === "Despesa")
    .reduce((t, l) => t + l.amount, 0);

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
          receitas{" "}
          <strong className="font-semibold tabular-nums text-gray-900">
            {formatarMoeda(entrou)}
          </strong>
        </span>
        <span>
          despesas{" "}
          <strong className="font-semibold tabular-nums text-gray-900">
            {formatarMoeda(saiu)}
          </strong>
        </span>
        <span>
          resultado{" "}
          <strong className="font-semibold tabular-nums text-alerta">
            {formatarMoeda(entrou - saiu)}
          </strong>
        </span>
      </p>

      <EntriesTable lancamentos={PARA_TABELA} hoje={HOJE} />

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
