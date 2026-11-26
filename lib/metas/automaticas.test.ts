import { describe, expect, it } from "vitest";
import {
  dasDoMeiDasContas,
  premissasAutomaticas,
  ticketPeloFunil,
  videosPorClientePelaCarteira,
} from "@/lib/metas/automaticas";
import { resumoDoFunil } from "@/lib/metas/funil";
import type { Premissas } from "@/lib/metas/projecao";
import type { ContaFixa } from "@/lib/metas/custo-fixo";

const GUARDADAS: Premissas = {
  ticketNovo: 1500,
  videosPorCliente: 3,
  impostoFixo: 600,
  contadorMensal: 0,
  dasDoMei: 80,
  impostoPercentual: 0.06,
  custoSaidaDoMei: 2000,
  mesSaidaDoMei: "2027-01",
  encargosClt: 0.4,
  guardarPorMes: 8500,
  metaGuardada: 50000,
  mesDaMeta: "2027-06",
};

const FUNIL = resumoDoFunil([
  { id: "1", name: "Ana", stage: "Negociação", estimated_monthly: 2000 },
  { id: "2", name: "Vértice", stage: "Negociação", estimated_monthly: 2000 },
]);

const CONTAS: (ContaFixa & { description: string })[] = [
  { description: "Pró-labore Fran", kind: "Despesa", amount: 6500, active: true, start_month: "2026-01", end_month: null },
  { description: "DAS do Simples Nacional", kind: "Despesa", amount: 86.05, active: true, start_month: "2026-01", end_month: null },
];

function conta(
  over: Partial<ContaFixa & { description: string }> = {},
): ContaFixa & { description: string } {
  return {
    description: "Conta",
    kind: "Despesa",
    amount: 100,
    active: true,
    start_month: "2026-01",
    end_month: null,
    ...over,
  };
}

const FUNIL_VAZIO = resumoDoFunil([]);

describe("o DAS vem das contas fixas", () => {
  it("acha a conta do DAS pelo nome", () => {
    expect(dasDoMeiDasContas(CONTAS)).toBeCloseTo(86.05, 2);
  });

  it("sem a conta do DAS, devolve null e a premissa guardada fica", () => {
    const sem = CONTAS.filter((c) => !/das/i.test(c.description));
    expect(dasDoMeiDasContas(sem)).toBeNull();
    const r = premissasAutomaticas(GUARDADAS, FUNIL, sem, 41, 6);
    expect(r.premissas.dasDoMei).toBe(80);
    expect(r.calculadas.dasDoMei.origem).toBe("decisão");
  });

  it("não confunde 'Adobe' com DAS", () => {
    // A busca é por palavra inteira, senão qualquer "das" no meio de
    // uma palavra viraria o imposto.
    const confuso = [
      { description: "Despesas diversas", kind: "Despesa", amount: 10, active: true, start_month: "2026-01", end_month: null },
    ];
    expect(dasDoMeiDasContas(confuso)).toBeNull();
  });

  it("conta pausada não vale", () => {
    const pausada = CONTAS.map((c) =>
      /das/i.test(c.description) ? { ...c, active: false } : c,
    );
    expect(dasDoMeiDasContas(pausada)).toBeNull();
  });
});

describe("o ticket vem do funil", () => {
  it("usa a média das oportunidades em jogo", () => {
    const t = ticketPeloFunil(FUNIL, 1500);
    expect(t.valor).toBe(2000);
    expect(t.origem).toBe("funil");
  });

  it("sem funil, fica o valor guardado", () => {
    const t = ticketPeloFunil(resumoDoFunil([]), 1500);
    expect(t.valor).toBe(1500);
    expect(t.origem).toBe("decisão");
  });
});

describe("os vídeos por cliente vêm da carteira", () => {
  it("é a média dos contratos que têm o número", () => {
    // 41 vídeos em 6 contratos que informam a quantidade.
    const v = videosPorClientePelaCarteira(41, 6, 3);
    expect(v.valor).toBeCloseTo(6.83, 2);
    expect(v.origem).toBe("carteira");
  });

  it("sem contrato com número, fica o valor guardado", () => {
    expect(videosPorClientePelaCarteira(0, 0, 4).valor).toBe(4);
    expect(videosPorClientePelaCarteira(41, 0, 4).origem).toBe("decisão");
  });
});

describe("as premissas prontas", () => {
  it("troca as três que o sistema sabe e deixa o resto", () => {
    const r = premissasAutomaticas(GUARDADAS, FUNIL, CONTAS, 41, 6);
    expect(r.premissas.ticketNovo).toBe(2000);
    expect(r.premissas.videosPorCliente).toBeCloseTo(6.83, 2);
    expect(r.premissas.dasDoMei).toBeCloseTo(86.05, 2);
    // O que é decisão das duas não muda.
    expect(r.premissas.guardarPorMes).toBe(8500);
    expect(r.premissas.metaGuardada).toBe(50000);
    expect(r.premissas.mesSaidaDoMei).toBe("2027-01");
    expect(r.premissas.encargosClt).toBe(0.4);
  });

  it("diz de onde cada uma veio, para a tela poder escrever", () => {
    const r = premissasAutomaticas(GUARDADAS, FUNIL, CONTAS, 41, 6);
    expect(r.calculadas.ticketNovo.origem).toBe("funil");
    expect(r.calculadas.videosPorCliente.origem).toBe("carteira");
    expect(r.calculadas.dasDoMei.origem).toBe("contas fixas");
  });
});

describe("o DAS não pode vir de uma conta que só cita o DAS", () => {
  it("ignora uma conta chamada Ferramentas e DAS do MEI", () => {
    /* O erro de verdade: a primeira versão procurava a palavra em
       qualquer lugar da descrição e leu R$ 1.055,32 como se fosse o
       imposto de R$ 86,05. Doze vezes maior, entrando calado na
       projeção. */
    const contas = [
      conta({ description: "Ferramentas e DAS do MEI", amount: 1055.32 }),
    ];
    expect(dasDoMeiDasContas(contas)).toBeNull();
  });

  it("aceita a conta que começa com DAS", () => {
    const contas = [
      conta({ description: "Ferramentas e DAS do MEI", amount: 1055.32 }),
      conta({ description: "DAS do Simples Nacional", amount: 86.05 }),
    ];
    expect(dasDoMeiDasContas(contas)).toBe(86.05);
  });

  it("o último DAS pago ganha da conta fixa", () => {
    const contas = [conta({ description: "DAS do Simples Nacional", amount: 86.05 })];
    const { premissas, calculadas } = premissasAutomaticas(
      GUARDADAS, FUNIL_VAZIO, contas, 0, 0, 81.9,
    );
    expect(premissas.dasDoMei).toBe(81.9);
    expect(calculadas.dasDoMei.origem).toBe("financeiro");
  });
});
