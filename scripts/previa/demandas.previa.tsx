/**
 * Prévia das demandas internas na Fila de trabalho.
 *
 * Renderiza o DemandasPainel de verdade, com as duas demandas que o
 * SQL cria e mais algumas para ver os quatro grupos de urgência.
 */
import { describe, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
  usePathname: () => "/interno/fila",
  useSearchParams: () => new URLSearchParams(),
}));

import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { AreaHeader } from "@/components/interno/area-header";
import { Secao } from "@/components/interno/secao";
import { DemandasPainel } from "@/components/empresa/demandas-painel";
import type { Demanda } from "@/lib/empresa/demandas";

const AGORA = "2026-11-26T14:00:00Z";

const DEMANDAS: Demanda[] = [
  {
    id: "1",
    title: "Refazer os contratos de todos os clientes, com vigência de 1 ano",
    area: "administrativo",
    responsavel: "Vitória",
    due_date: "2026-12-20",
    notes: null,
    done_at: null,
  },
  {
    id: "2",
    title: "Pesquisar cartão de crédito com milhas",
    area: "financeiro",
    responsavel: "Fran",
    due_date: "2026-12-15",
    notes: null,
    done_at: null,
  },
  {
    id: "3",
    title: "Mandar o contrato da Vértice para assinar",
    area: "comercial",
    responsavel: "Vitória",
    due_date: "2026-11-24",
    notes: null,
    done_at: null,
  },
  {
    id: "4",
    title: "Pagar o DAS de novembro",
    area: "financeiro",
    responsavel: null,
    due_date: "2026-11-26",
    notes: null,
    done_at: null,
  },
  {
    id: "5",
    title: "Organizar a pasta de documentos no Drive",
    area: "administrativo",
    responsavel: null,
    due_date: null,
    notes: null,
    done_at: null,
  },
  {
    id: "6",
    title: "Fechar o mês de outubro",
    area: "financeiro",
    responsavel: "Fran",
    due_date: "2026-11-10",
    notes: null,
    done_at: "2026-11-24T12:00:00Z",
  },
];

describe("prévia", () => {
  it("escreve o HTML das demandas internas", () => {
    writeFileSync(
      process.env.SAIDA_DEMANDAS!,
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="app.css"></head>
<body data-area="fila"><div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">${renderToStaticMarkup(
        <>
          <AreaHeader titulo="Fila de trabalho" contexto="Pendências de hoje" />
          <Secao titulo="Demandas internas">
            <DemandasPainel
              demandas={DEMANDAS}
              responsaveis={[
                { id: "a", nome: "Fran" },
                { id: "b", nome: "Vitória" },
              ]}
              agoraISO={AGORA}
            />
          </Secao>
        </>,
      )}</div></body></html>`,
    );
  });
});
