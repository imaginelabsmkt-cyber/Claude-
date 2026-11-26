/**
 * Prévia da aba Metas.
 *
 * Renderiza a TabelaDaProjecao de verdade, alimentada pela projeção
 * de verdade, com as premissas e o ritmo da planilha da Vitória. Os
 * números abaixo têm que bater com a aba "Meta 50 mil" dela.
 */
import { describe, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
  usePathname: () => "/interno/financeiro/metas",
  useSearchParams: () => new URLSearchParams(),
}));

import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { AreaHeader } from "@/components/interno/area-header";
import { FinanceTabs } from "@/components/financeiro/finance-tabs";
import { TabelaDaProjecao } from "@/components/metas/tabela-da-projecao";
import { montarProjecao, type Contratacao } from "@/lib/metas/projecao";
import { custoFixoPorMes } from "@/lib/metas/custo-fixo";
import { PainelDasMetas } from "@/components/metas/painel-das-metas";

const PREMISSAS = {
  ticketNovo: 2000,
  videosPorCliente: 4,
  videosDoEditor: 50,
  precoPorVideo: 50,
  impostoFixo: 600,
  contadorMensal: 0,
  dasDoMei: 86.05,
  impostoPercentual: 0.06,
  custoSaidaDoMei: 2000,
  mesSaidaDoMei: "2027-01",
  encargosClt: 0.4,
  guardarPorMes: 8500,
  metaGuardada: 50000,
  mesDaMeta: "2027-06",
  clientesNaProjecao: 20,
};

const EQUIPE: Contratacao[] = [
  { id: "videomaker", cargo: "Videomaker", forma: "mensal", custoMensal: null, mesDeInicio: "2027-03", ativa: true, clt: false },
  { id: "editor", cargo: "Editor", forma: "por_video", custoMensal: null, mesDeInicio: "2027-03", ativa: true, clt: false },
  { id: "cs", cargo: "CS", forma: "mensal", custoMensal: 2000, mesDeInicio: "2027-04", ativa: true, clt: true },
  { id: "social", cargo: "Social media", forma: "mensal", custoMensal: 2000, mesDeInicio: "2027-05", ativa: true, clt: true },
];

/* As contas fixas de verdade da Favie, com a mentoria acabando em
   fevereiro — é o degrau de R$ 2.166,70 no meio da tabela. */
const CONTAS = [
  { kind: "Despesa", amount: 6500, active: true, start_month: "2026-01", end_month: null },
  { kind: "Despesa", amount: 6500, active: true, start_month: "2026-01", end_month: null },
  { kind: "Despesa", amount: 2166.7, active: true, start_month: "2026-01", end_month: "2027-02" },
  { kind: "Despesa", amount: 1055.32, active: true, start_month: "2026-01", end_month: null },
];

const RITMO = {
  "2027-01": 4, "2027-02": 2, "2027-03": 2,
  "2027-04": 2, "2027-05": 2, "2027-06": 0,
};

describe("prévia", () => {
  it("escreve o HTML das Metas", () => {
    const p = montarProjecao("2027-01", PREMISSAS, EQUIPE, RITMO, {
      clientesAtivos: 8,
      faturamentoRecorrente: 14450,
      custoFixoPorMes: custoFixoPorMes(CONTAS, "2027-01", 6),
      custoFixoPadrao: 14055.32,
      videosDeHoje: 41,
    });

    writeFileSync(
      process.env.SAIDA_METAS!,
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="app.css"></head>
<body data-area="financeiro"><div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">${renderToStaticMarkup(
        <>
          <AreaHeader titulo="Metas" />
          <FinanceTabs />
          <TabelaDaProjecao
            meses={p.meses}
            pessoas={EQUIPE}
            meta={PREMISSAS.metaGuardada}
          />
          <div className="mt-6">
            <PainelDasMetas
              premissas={PREMISSAS}
              contratacoes={EQUIPE.map((c) => ({ ...c, nota: null }))}
              ritmo={RITMO}
              meses={p.meses.map((m) => m.mes)}
              podeSalvar
            />
          </div>
        </>,
      )}</div></body></html>`,
    );
  });
});
