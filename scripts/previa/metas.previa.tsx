/**
 * Prévia da tela de Metas, com os componentes de verdade.
 *
 * Os números têm que bater com a planilha da Vitória, com uma
 * diferença que foi o pedido da Fran: o ritmo de entrada não é mais
 * digitado. Aqui a prévia chama a MESMA busca que a tela chama, para
 * ver o ritmo que a meta exige sair da conta.
 */
import { describe, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
  usePathname: () => "/interno/metas",
  useSearchParams: () => new URLSearchParams(),
}));

import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { AreaHeader } from "@/components/interno/area-header";
import { Secao } from "@/components/interno/secao";
import { Stat } from "@/components/interno/stat";
import { TabelaDaProjecao } from "@/components/metas/tabela-da-projecao";
import { PainelDasMetas } from "@/components/metas/painel-das-metas";
import { PremissasDoSistema } from "@/components/metas/premissas-do-sistema";
import { FunilNasMetas } from "@/components/metas/funil-nas-metas";
import {
  montarProjecao,
  ritmoParaAMeta,
  type Contratacao,
  type Premissas,
} from "@/lib/metas/projecao";
import { custoFixoPorMes } from "@/lib/metas/custo-fixo";
import { premissasAutomaticas } from "@/lib/metas/automaticas";
import { resumoDoFunil, oQueFaltaNoFunil } from "@/lib/metas/funil";
import { rotuloMesCurto } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";

const GUARDADAS: Premissas = {
  ticketNovo: 2000,
  videosPorCliente: 4,
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
};

const EQUIPE: Contratacao[] = [
  { id: "advogado", cargo: "Advogado", forma: "uma_vez", custoMensal: 3000,
    valorPorUnidade: null, tetoDeUnidades: null, mesDeInicio: "2027-02",
    ativa: true, clt: false },
  { id: "editor", cargo: "Editor", forma: "por_video_editado", custoMensal: null,
    valorPorUnidade: 50, tetoDeUnidades: 50, mesDeInicio: "2027-03",
    ativa: true, clt: false },
  { id: "videomaker", cargo: "Videomaker", forma: "por_video_gravado", custoMensal: null,
    valorPorUnidade: 60, tetoDeUnidades: 45, mesDeInicio: "2027-03",
    ativa: true, clt: false },
  { id: "cs", cargo: "CS", forma: "mensal", custoMensal: 2000,
    valorPorUnidade: null, tetoDeUnidades: null, mesDeInicio: "2027-04",
    ativa: true, clt: true },
  { id: "social", cargo: "Social media", forma: "por_cliente", custoMensal: null,
    valorPorUnidade: 200, tetoDeUnidades: 10, mesDeInicio: "2027-05",
    ativa: true, clt: false },
];

/* As contas fixas de verdade da Favie, com a mentoria acabando em
   fevereiro, é o degrau de R$ 2.166,70 no meio da tabela. O DAS está
   aqui com o nome dele porque é daqui que a premissa é lida. */
const CONTAS = [
  { description: "Pró-labore Fran", kind: "Despesa", amount: 6500, active: true, start_month: "2026-01", end_month: null },
  { description: "Pró-labore Vitória", kind: "Despesa", amount: 6500, active: true, start_month: "2026-01", end_month: null },
  { description: "Mentoria Ultralize", kind: "Despesa", amount: 2166.7, active: true, start_month: "2026-01", end_month: "2027-02" },
  { description: "Ferramentas e assinaturas", kind: "Despesa", amount: 969.27, active: true, start_month: "2026-01", end_month: null },
  { description: "DAS do Simples Nacional", kind: "Despesa", amount: 86.05, active: true, start_month: "2026-01", end_month: null },
];

/* O funil de verdade: quatro oportunidades em negociação. */
const FUNIL = resumoDoFunil([
  { id: "1", name: "Dra. Ana Gessyca", stage: "Negociação", estimated_monthly: 2000 },
  { id: "2", name: "Vértice Arquitetura", stage: "Proposta apresentada", estimated_monthly: 2500 },
  { id: "3", name: "Dra. Bruna Arantes", stage: "Primeiro contato", estimated_monthly: 1800 },
  { id: "4", name: "Rafaela Nutricionista", stage: "Negociação", estimated_monthly: 2000 },
]);

const DO_SISTEMA = {
  clientesAtivos: 8,
  faturamentoRecorrente: 14450,
  custoFixoPorMes: custoFixoPorMes(CONTAS, "2027-01", 6),
  custoFixoPadrao: 14055.32,
  videosDeHoje: 41,
};

describe("prévia", () => {
  it("escreve o HTML das Metas", () => {
    /* A mesma ordem da tela: funil primeiro, premissas saem dele, e
       só então a projeção. */
    const { premissas, calculadas } = premissasAutomaticas(
      GUARDADAS, FUNIL, CONTAS, 41, 6,
    );
    const ritmo = ritmoParaAMeta("2027-01", premissas, EQUIPE, DO_SISTEMA);
    const p = montarProjecao("2027-01", premissas, EQUIPE, ritmo.porMes, DO_SISTEMA);
    const ultimo = p.meses[p.meses.length - 1];
    const pedidos = p.meses.reduce((t, m) => t + m.novosClientes, 0);

    writeFileSync(
      process.env.SAIDA_METAS!,
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="app.css"></head>
<body data-area="metas"><div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">${renderToStaticMarkup(
        <>
          <AreaHeader titulo="Metas" contexto="Projeção, equipe e premissas" />

          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              rotulo="Meta"
              valor={formatarMoeda(premissas.metaGuardada)}
              detalhe={`guardado até ${rotuloMesCurto(premissas.mesDaMeta)}`}
            />
            <Stat
              rotulo="Precisa fechar"
              valor={`${ritmo.quantosPorMes}/mês`}
              detalhe={`${pedidos} clientes até ${rotuloMesCurto(premissas.mesDaMeta)}`}
            />
            <Stat
              rotulo="Bate a meta em"
              valor={p.mesEmQueBate ? rotuloMesCurto(p.mesEmQueBate) : "-"}
              detalhe={`${formatarMoeda(p.guardadoAteAMeta)} guardados`}
            />
            <Stat
              rotulo="Clientes no fim"
              valor={String(ultimo?.clientesNoTotal ?? 8)}
              detalhe="hoje são 8"
            />
          </div>

          <Secao titulo="De onde vêm os clientes novos">
            <FunilNasMetas
              funil={FUNIL}
              pedidos={pedidos}
              faltam={oQueFaltaNoFunil(FUNIL, pedidos).faltam}
              ticketDaProjecao={premissas.ticketNovo}
              mesDaMeta={premissas.mesDaMeta}
            />
          </Secao>

          <Secao titulo="Mês a mês até jun/27">
            <TabelaDaProjecao
              meses={p.meses}
              pessoas={EQUIPE}
              meta={premissas.metaGuardada}
            />
          </Secao>

          <Secao titulo="Mexer na projeção">
            <div className="mb-6">
              <PremissasDoSistema
                calculadas={calculadas}
                ritmo={ritmo}
                mesDaMeta={premissas.mesDaMeta}
                clientesHoje={8}
                faturamentoDeHoje={14450}
                custoFixoDoMes={DO_SISTEMA.custoFixoPorMes["2027-01"] ?? 0}
                mesDoCustoFixo="2027-01"
              />
            </div>
            <PainelDasMetas
              premissas={premissas}
              contratacoes={EQUIPE.map((c) => ({ ...c, nota: null }))}
              primeiroMes="2027-01"
              podeSalvar
            />
          </Secao>
        </>,
      )}</div></body></html>`,
    );
  });
});
