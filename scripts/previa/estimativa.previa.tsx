/**
 * Prévia da Estimativa.
 *
 * Renderiza o COMPONENTE DE VERDADE com a carteira real de
 * novembro/2026, os oito clientes e o custo fixo que estão no
 * sistema. Sem cópia de markup.
 *
 * O funil é exemplo, e está escrito na tela: as oportunidades da
 * Favie não estão no seed, e eu não invento nome de cliente numa
 * imagem que ela vai olhar.
 */
import { describe, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
  usePathname: () => "/interno/financeiro/estimativa",
  useSearchParams: () => new URLSearchParams(),
}));

import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { AreaHeader } from "@/components/interno/area-header";
import { FinanceTabs } from "@/components/financeiro/finance-tabs";
import { PainelDaEstimativa } from "@/components/financeiro/painel-da-estimativa";

/* A carteira da Favie em novembro/2026, como está na planilha. */
const CARTEIRA = [
  { id: "1", nome: "Malukies Cookies & Co", mensal: 2600 },
  { id: "2", nome: "Kiku Sushi", mensal: 2200 },
  { id: "3", nome: "Dra. Hemilayne", mensal: 2000 },
  { id: "4", nome: "Izabela Schipitoski", mensal: 1800 },
  { id: "5", nome: "Natural Concept", mensal: 1700 },
  { id: "6", nome: "Laura Chioquetta", mensal: 1550 },
  { id: "7", nome: "Studio Bambu", mensal: 1300 },
  { id: "8", nome: "Salte", mensal: 1300 },
];
/* O funil é EXEMPLO: as oportunidades da Favie não estão no seed, e
   inventar nome de cliente de verdade numa imagem já me fez mostrar
   uma tela que não existia. Aqui está marcado. */
const PROSPECCAO = [
  { id: "p1", nome: "Exemplo 1 (clínica)", mensal: 2400, etapa: "Negociação", temperatura: "Quente" },
  { id: "p2", nome: "Exemplo 2 (restaurante)", mensal: 1800, etapa: "Proposta apresentada", temperatura: "Morno" },
  { id: "p3", nome: "Exemplo 3 (loja)", mensal: 1500, etapa: "Reunião marcada", temperatura: "Frio" },
  { id: "p4", nome: "Exemplo 4 (advocacia)", mensal: 1300, etapa: "Diagnóstico", temperatura: "Morno" },
];
const CUSTO_FIXO = 14055.32;
const TICKET = CARTEIRA.reduce((t, c) => t + c.mensal, 0) / CARTEIRA.length;

describe("prévia", () => {
  it("escreve o HTML da Estimativa", () => {
    writeFileSync(
      process.env.SAIDA_ESTIMATIVA!,
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="app.css"></head>
<body data-area="financeiro"><div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">${renderToStaticMarkup(
        <>
          <AreaHeader titulo="Estimativa" />
          <FinanceTabs />
          <PainelDaEstimativa
            carteira={CARTEIRA}
            prospeccao={PROSPECCAO}
            custoFixo={CUSTO_FIXO}
            ticketMedio={TICKET}
          />
        </>,
      )}</div></body></html>`,
    );
  });
});
