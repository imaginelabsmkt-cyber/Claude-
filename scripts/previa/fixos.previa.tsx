/**
 * Prévia visual de "Fixos e ferramentas".
 *
 * Não é teste: não afirma nada. Renderiza o PAINEL DE VERDADE —
 * `RecurrencesPanel` —, com o roteador fingido, porque ele é
 * componente de cliente.
 *
 * A versão anterior tinha uma cópia do markup das linhas, e cópia
 * envelhece: já me fez mandar para a Fran a imagem de uma tela que
 * não existia mais. Não tem mais cópia.
 */
import { describe, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
  usePathname: () => "/interno/financeiro/recorrencias",
  useSearchParams: () => new URLSearchParams("mes=2026-11"),
}));

import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { RecurrencesPanel } from "@/components/financeiro/recurrences-panel";
import type { FinancialCategory, FinancialRecurrenceWithRelations } from "@/types";

const FERRAMENTAS = "Assinaturas e ferramentas digitais";
const PROLABORE = "Pró-labore (sócias)";
const DAS = "DAS - Simples Nacional";
const MENSALIDADES = "Mensalidades / clientes recorrentes";

const CATEGORIAS: FinancialCategory[] = [
  [FERRAMENTAS, "Despesa"],
  [PROLABORE, "Despesa"],
  [DAS, "Despesa"],
  [MENSALIDADES, "Receita"],
].map(([name, kind], i) => ({
  id: `cat-${i}`,
  name: name as string,
  kind: kind as "Receita" | "Despesa",
  sort_order: i,
  active: true,
  created_at: "2026-04-01T00:00:00Z",
  updated_at: "2026-04-01T00:00:00Z",
}));

const catId = (nome: string) => CATEGORIAS.find((c) => c.name === nome)!.id;

function recorrencia(
  description: string,
  amount: number,
  categoria: string,
  due_day: number | null,
  extra: Partial<FinancialRecurrenceWithRelations> = {},
): FinancialRecurrenceWithRelations {
  const cat = CATEGORIAS.find((c) => c.name === categoria)!;
  return {
    id: description,
    description,
    kind: cat.kind,
    category_id: cat.id,
    client_id: null,
    amount,
    due_day,
    vencimento_meses: 1,
    start_month: "2026-04",
    end_month: null,
    active: true,
    notes: null,
    team_member_id: null,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
    category: cat,
    client: null,
    ...extra,
  } as FinancialRecurrenceWithRelations;
}

/** Os fixos como estão na planilha do Drive, depois das correções. */
const REAIS: FinancialRecurrenceWithRelations[] = [
  recorrencia("Pró-labore Fran", 6500, PROLABORE, 10),
  recorrencia("Pró-labore Vitória", 6500, PROLABORE, 10),
  recorrencia("Claude Max", 454.1, FERRAMENTAS, 20),
  recorrencia("ChatGPT Plus", 119.9, FERRAMENTAS, 20),
  recorrencia("Adobe", 95, FERRAMENTAS, 20),
  recorrencia("Adobe Premiere", 65, FERRAMENTAS, 20),
  recorrencia("iCloud Fran", 66.9, FERRAMENTAS, 20),
  recorrencia("iCloud Vitória", 66.9, FERRAMENTAS, 20),
  recorrencia("Canva", 35, FERRAMENTAS, 20),
  recorrencia("ElevenLabs", 33.57, FERRAMENTAS, 20),
  recorrencia("CapCut", 32.9, FERRAMENTAS, 20, { active: false }),
  recorrencia("Mentoria Ultralize", 2166.7, FERRAMENTAS, 10, {
    end_month: "2027-02",
  }),
  recorrencia("DAS do Simples Nacional", 86.05, DAS, 20),
  recorrencia("Mensalidade Malukies Cookies & Co", 2600, MENSALIDADES, 10),
  recorrencia("Mensalidade Kiku Sushi", 2200, MENSALIDADES, 10),
  recorrencia("Mensalidade Dra. Hemilayne", 2000, MENSALIDADES, 10),
  recorrencia("Mensalidade Natural Concept", 1700, MENSALIDADES, 25),
  recorrencia("Mensalidade Laura Chioquetta", 1550, MENSALIDADES, 25),
  recorrencia("Mensalidade Studio Bambu", 1300, MENSALIDADES, 25),
  recorrencia("Mensalidade Salte", 1300, MENSALIDADES, null, {
    start_month: "2026-11",
  }),
  recorrencia("Mensalidade Izabela Schipitoski (1ª parcela)", 900, MENSALIDADES, 10),
  recorrencia("Mensalidade Izabela Schipitoski (2ª parcela)", 900, MENSALIDADES, 25),
];

describe("prévia", () => {
  it("escreve o HTML de Fixos e ferramentas", () => {
    writeFileSync(
      process.env.SAIDA_FIXOS!,
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="app.css"></head>
<body data-area="financeiro"><div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">${renderToStaticMarkup(
        <RecurrencesPanel
          mes="2026-11"
          recorrencias={REAIS}
          categorias={CATEGORIAS}
          clientes={[]}
        />,
      )}</div></body></html>`,
    );
  });
});
