/**
 * Prévia visual do funil em LISTA.
 *
 * ATENÇÃO, e isto é regra deste arquivo: o funil da Favie não está no
 * seed, então os nomes aqui são INVENTADOS e marcados como exemplo. A
 * regra de "números de verdade" vale para o financeiro, onde a
 * planilha existe; aqui não existe dado real para copiar, e fingir que
 * existe foi o erro que eu já cometi uma vez. Quem olhar esta imagem
 * tem que saber na hora que é exemplo.
 */
import { describe, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
  usePathname: () => "/interno/comercial/funil",
  useSearchParams: () => new URLSearchParams(),
}));

import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { BarraDoFunil } from "@/components/comercial/barra-do-funil";
import { ListaOportunidades } from "@/components/comercial/lista-oportunidades";
import type { LeadWithRelations } from "@/types";

const HOJE = new Date();
const daqui = (dias: number, h = 10) => {
  const d = new Date(HOJE);
  d.setDate(d.getDate() + dias);
  d.setHours(h, 0, 0, 0);
  return d.toISOString();
};
const atras = (dias: number) => {
  const d = new Date(HOJE);
  d.setDate(d.getDate() - dias);
  return d.toISOString();
};

function op(
  nome: string,
  stage: LeadWithRelations["stage"],
  channel: LeadWithRelations["channel"],
  valor: number,
  extras: Partial<LeadWithRelations> = {},
): LeadWithRelations {
  return {
    id: nome,
    name: nome,
    contact_name: null,
    contact_email: null,
    contact_phone: null,
    source: null,
    channel,
    stage,
    max_stage: stage,
    estimated_monthly: valor,
    notes: null,
    client_id: null,
    lost_reason: null,
    meeting_at: null,
    stage_changed_at: atras(1),
    created_at: atras(30),
    updated_at: atras(1),
    proposals: [],
    client: null,
    ...extras,
  } as LeadWithRelations;
}

/** EXEMPLO — não são clientes da Favie. */
const EXEMPLO: LeadWithRelations[] = [
  op("Exemplo 1 (clínica)", "Negociação", "Indicação", 2400, {
    stage_changed_at: atras(9),
  }),
  op("Exemplo 2 (restaurante)", "Reunião marcada", "Tráfego pago", 1800, {
    meeting_at: daqui(0, 14),
  }),
  op("Exemplo 3 (loja)", "Reunião marcada", "Social selling", 1500, {
    meeting_at: daqui(2, 16),
  }),
  op("Exemplo 4 (advocacia)", "Proposta apresentada", "Indicação", 1300, {
    stage_changed_at: atras(2),
  }),
  op("Exemplo 5 (estúdio)", "Diagnóstico", "Evento", 900, {
    stage_changed_at: atras(0),
  }),
  op("Exemplo 6 (contador)", "Contato feito", "Parceria", 700, {
    meeting_at: atras(2),
  }),
];

describe("prévia: o funil em lista", () => {
  it("desenha", () => {
    const html = renderToStaticMarkup(
      <div className="min-h-screen bg-papel p-6">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900">
            PRÉVIA — os nomes são inventados. O desenho é o de verdade.
          </p>
          <BarraDoFunil quantos={EXEMPLO.length} />
          <ListaOportunidades leads={EXEMPLO} agora={HOJE} />
        </div>
      </div>,
    );
    writeFileSync(
      process.env.SAIDA_COMERCIAL!,
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="app.css"></head><body>${html}</body></html>`,
    );
  });
});
