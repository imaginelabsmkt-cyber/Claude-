/**
 * Prévia visual da ficha da oportunidade: barra de etapas, atividades
 * e linha do tempo.
 *
 * NOMES INVENTADOS, e marcados como tal na própria imagem — o funil da
 * Favie não está no seed, então não há dado real para copiar. Fingir
 * que há foi o erro que eu já cometi uma vez.
 */
import { describe, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
  usePathname: () => "/interno/comercial/x",
  useSearchParams: () => new URLSearchParams(),
}));

import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { AtividadesPanel } from "@/components/comercial/atividades-panel";
import { BarraDeEtapas } from "@/components/comercial/barra-de-etapas";
import { LinhaDoTempo } from "@/components/comercial/linha-do-tempo";
import type { AtividadeComDono, PassoDaEtapa } from "@/lib/data/comercial";

const AGORA = new Date();
const dias = (n: number, h = 10) => {
  const d = new Date(AGORA);
  d.setDate(d.getDate() + n);
  d.setHours(h, 0, 0, 0);
  return d.toISOString();
};

const PASSOS: PassoDaEtapa[] = [
  { id: "1", de: null, para: "Contato feito", em: dias(-24) },
  { id: "2", de: "Contato feito", para: "Diagnóstico", em: dias(-19) },
  { id: "3", de: "Diagnóstico", para: "Reunião marcada", em: dias(-12) },
  { id: "4", de: "Reunião marcada", para: "Proposta apresentada", em: dias(-5) },
];

const ATIVIDADES: AtividadeComDono[] = [
  {
    id: "a1",
    kind: "WhatsApp",
    subject: "Cobrar retorno da proposta",
    lead_id: "x",
    client_id: null,
    due_at: dias(-2, 9),
    done_at: null,
    notes: null,
    created_at: dias(-5),
    updated_at: dias(-5),
    leadNome: "Exemplo (clínica)",
    clienteNome: null,
  },
  {
    id: "a2",
    kind: "Ligação",
    subject: "Confirmar orçamento com a sócia",
    lead_id: "x",
    client_id: null,
    due_at: dias(0, 15),
    done_at: null,
    notes: null,
    created_at: dias(-3),
    updated_at: dias(-3),
    leadNome: "Exemplo (clínica)",
    clienteNome: null,
  },
  {
    id: "a3",
    kind: "Reunião",
    subject: "Apresentar a proposta",
    lead_id: "x",
    client_id: null,
    due_at: dias(-5, 14),
    done_at: dias(-5, 15),
    notes: null,
    created_at: dias(-12),
    updated_at: dias(-5),
    leadNome: "Exemplo (clínica)",
    clienteNome: null,
  },
];

describe("prévia: a ficha da oportunidade", () => {
  it("desenha", () => {
    const html = renderToStaticMarkup(
      <div data-area="comercial" className="min-h-screen bg-papel p-6">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900">
            PRÉVIA — nomes inventados. O desenho é o de verdade.
          </p>

          <div className="mb-5">
            <BarraDeEtapas
              leadId="x"
              etapa="Proposta apresentada"
              encerrada={false}
            />
          </div>

          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Atividades
          </h2>
          <div className="mb-6">
            <AtividadesPanel
              leadId="x"
              atividades={ATIVIDADES}
              agoraISO={AGORA.toISOString()}
            />
          </div>

          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Linha do tempo
          </h2>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <LinhaDoTempo passos={PASSOS} agora={AGORA} />
          </div>
        </div>
      </div>,
    );
    writeFileSync(
      process.env.SAIDA_FICHA!,
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="app.css"></head><body>${html}</body></html>`,
    );
  });
});
