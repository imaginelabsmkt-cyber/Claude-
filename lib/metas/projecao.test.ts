import { describe, expect, it } from "vitest";
import {
  clientesParaChegarA,
  custoDaPessoa,
  mesesEntre,
  montarProjecao,
  somarMeses,
  type Contratacao,
  type DoSistema,
  type Premissas,
} from "@/lib/metas/projecao";

/* As premissas da planilha da Vitória, uma por uma. */
const PREMISSAS: Premissas = {
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

/* O que o sistema sabe em novembro/2026. */
/*
 * O custo fixo cai em março: a mentoria Ultralize acaba em fevereiro.
 * Na planilha isso eram dois números e uma data, digitados à mão. No
 * sistema, cada conta fixa tem mês de início e de fim, e esta soma
 * sai calculada mês a mês.
 */
const COM_MENTORIA = 16222.02;
const SEM_MENTORIA = 14055.32;

const SISTEMA: DoSistema = {
  clientesAtivos: 8,
  faturamentoRecorrente: 14450,
  custoFixoPorMes: {
    "2027-01": COM_MENTORIA,
    "2027-02": COM_MENTORIA,
    "2027-03": SEM_MENTORIA,
    "2027-04": SEM_MENTORIA,
    "2027-05": SEM_MENTORIA,
    "2027-06": SEM_MENTORIA,
  },
  custoFixoPadrao: SEM_MENTORIA,
  videosDeHoje: 41,
};

const RITMO = {
  "2027-01": 4,
  "2027-02": 2,
  "2027-03": 2,
  "2027-04": 2,
  "2027-05": 2,
  "2027-06": 0,
};

function pessoa(over: Partial<Contratacao> = {}): Contratacao {
  return {
    id: "p1",
    cargo: "CS",
    forma: "mensal",
    custoMensal: 2000,
    mesDeInicio: "2027-04",
    ativa: true,
    clt: true,
    ...over,
  };
}

const EQUIPE: Contratacao[] = [
  pessoa({ id: "editor", cargo: "Editor", forma: "por_video", custoMensal: null, mesDeInicio: "2027-03", clt: false }),
  pessoa({ id: "cs", cargo: "CS", mesDeInicio: "2027-04" }),
  pessoa({ id: "social", cargo: "Social media", mesDeInicio: "2027-05" }),
];

describe("contas de mês", () => {
  it("soma meses virando o ano", () => {
    expect(somarMeses("2026-11", 1)).toBe("2026-12");
    expect(somarMeses("2026-12", 1)).toBe("2027-01");
    expect(somarMeses("2027-01", 12)).toBe("2028-01");
    expect(somarMeses("2027-03", -4)).toBe("2026-11");
  });

  it("conta a distância entre meses nos dois sentidos", () => {
    expect(mesesEntre("2027-01", "2027-06")).toBe(5);
    expect(mesesEntre("2026-11", "2027-01")).toBe(2);
    expect(mesesEntre("2027-06", "2027-01")).toBe(-5);
    expect(mesesEntre("2027-03", "2027-03")).toBe(0);
  });
});

describe("custo de cada pessoa", () => {
  it("antes do mês de início não custa nada", () => {
    expect(custoDaPessoa(pessoa(), "2027-03", PREMISSAS, 73)).toBe(0);
    expect(custoDaPessoa(pessoa(), "2027-04", PREMISSAS, 81)).toBe(2800);
  });

  it("CLT soma os encargos; PJ não", () => {
    // R$ 2.000 + 40% = R$ 2.800, como na planilha.
    expect(custoDaPessoa(pessoa({ clt: true }), "2027-04", PREMISSAS, 81)).toBe(2800);
    expect(custoDaPessoa(pessoa({ clt: false }), "2027-04", PREMISSAS, 81)).toBe(2000);
  });

  it("o editor para no teto de vídeos dele", () => {
    const editor = pessoa({ forma: "por_video", mesDeInicio: "2027-03", custoMensal: null });
    // 73 vídeos, teto de 50: paga 50 × R$ 50 = R$ 2.500.
    expect(custoDaPessoa(editor, "2027-03", PREMISSAS, 73)).toBe(2500);
    // 30 vídeos: paga os 30.
    expect(custoDaPessoa(editor, "2027-03", PREMISSAS, 30)).toBe(1500);
  });

  it("desmarcada não custa nada, sem precisar apagar", () => {
    expect(custoDaPessoa(pessoa({ ativa: false }), "2027-06", PREMISSAS, 89)).toBe(0);
  });

  it("mensal sem valor conta zero — e a projeção avisa", () => {
    // É o videomaker: a Fran disse quando e para quê, não quanto.
    const vm = pessoa({ custoMensal: null, clt: false });
    expect(custoDaPessoa(vm, "2027-06", PREMISSAS, 89)).toBe(0);
    const p = montarProjecao("2027-01", PREMISSAS, [vm], RITMO, SISTEMA);
    expect(p.semValor.map((c) => c.id)).toEqual(["p1"]);
  });
});

describe("a projeção, contra a planilha da Vitória", () => {
  const p = montarProjecao("2027-01", PREMISSAS, EQUIPE, RITMO, SISTEMA);

  it("cobre de janeiro até o mês da meta", () => {
    expect(p.meses.map((m) => m.mes)).toEqual([
      "2027-01", "2027-02", "2027-03", "2027-04", "2027-05", "2027-06",
    ]);
  });

  it("o faturamento bate mês a mês", () => {
    // 14.450 + clientes acumulados × 2.000.
    expect(p.meses.map((m) => m.faturamento)).toEqual([
      22450, 26450, 30450, 34450, 38450, 38450,
    ]);
  });

  it("os clientes somam até 20", () => {
    expect(p.meses.map((m) => m.clientesNoTotal)).toEqual([
      12, 14, 16, 18, 20, 20,
    ]);
  });

  it("os vídeos somam até 89", () => {
    // 41 de hoje + 12 clientes × 4 vídeos.
    expect(p.meses.map((m) => m.videos)).toEqual([57, 65, 73, 81, 89, 89]);
  });

  it("a saída do MEI custa uma vez, em janeiro", () => {
    expect(p.meses.map((m) => m.saidaDoMei)).toEqual([2000, 0, 0, 0, 0, 0]);
  });

  it("o imposto novo entra no lugar do DAS, a partir da saída", () => {
    // 600 + 0 − 86,05 = 513,95, como na planilha.
    for (const m of p.meses) expect(m.impostoEContador).toBeCloseTo(513.95, 2);
  });

  it("cada pessoa entra no mês dela", () => {
    const editor = p.meses.map((m) => m.custoDasPessoas.editor);
    expect(editor).toEqual([0, 0, 2500, 2500, 2500, 2500]);
    const cs = p.meses.map((m) => m.custoDasPessoas.cs);
    expect(cs).toEqual([0, 0, 0, 2800, 2800, 2800]);
    const social = p.meses.map((m) => m.custoDasPessoas.social);
    expect(social).toEqual([0, 0, 0, 0, 2800, 2800]);
  });

  it("o editor leva 50 vídeos e o resto fica com a Fran", () => {
    // Antes dele entrar, tudo é da Fran.
    expect(p.meses[0].videosComOEditor).toBe(0);
    expect(p.meses[0].videosComAFran).toBe(57);
    // De março em diante, 50 com ele.
    expect(p.meses[2].videosComOEditor).toBe(50);
    expect(p.meses[2].videosComAFran).toBe(23);
    expect(p.meses[4].videosComAFran).toBe(39);
  });

  it("sobra e acumulado batem com a planilha", () => {
    const sobras = p.meses.map((m) => Number(m.sobra.toFixed(2)));
    expect(sobras).toEqual([3714.03, 9714.03, 13380.73, 14580.73, 15780.73, 15780.73]);
    expect(p.guardadoAteAMeta).toBeCloseTo(72950.98, 2);
  });

  it("diz em que mês a meta é batida", () => {
    // 41.389,52 em abril ainda não; 57.170,25 em maio passa dos 50 mil.
    expect(p.mesEmQueBate).toBe("2027-05");
    expect(p.diferencaParaAMeta).toBeCloseTo(22950.98, 2);
  });

  it("o faturamento mínimo do último mês paga tudo e guarda", () => {
    // Custo de junho + os R$ 8.500 de guardar.
    const junho = p.meses[5];
    expect(p.faturamentoMinimo).toBeCloseTo(junho.custoTotal + 8500, 2);
  });
});

describe("o custo fixo muda quando a mentoria acaba", () => {
  it("cada mês usa o custo fixo DELE", () => {
    /* Na planilha havia duas linhas, "até fev" e "a partir de mar",
       e uma fórmula com a data no meio. Aqui o custo fixo vem das
       contas fixas do sistema, que já sabem quando cada uma começa e
       acaba — então não se digita duas vezes nem se esquece de
       trocar. */
    const p = montarProjecao("2027-01", PREMISSAS, EQUIPE, RITMO, SISTEMA);
    expect(p.meses.map((m) => m.custoFixo)).toEqual([
      COM_MENTORIA, COM_MENTORIA,
      SEM_MENTORIA, SEM_MENTORIA, SEM_MENTORIA, SEM_MENTORIA,
    ]);
  });

  it("mês fora do mapa cai no custo fixo de hoje", () => {
    const p = montarProjecao(
      "2027-01",
      { ...PREMISSAS, mesDaMeta: "2027-08" },
      [],
      RITMO,
      SISTEMA,
    );
    expect(p.meses[7].mes).toBe("2027-08");
    expect(p.meses[7].custoFixo).toBeCloseTo(SEM_MENTORIA, 2);
  });
});

describe("mês sem cliente novo não some da tabela", () => {
  it("todo mês até a meta aparece, mesmo sem entrada", () => {
    const p = montarProjecao("2027-01", PREMISSAS, [], { "2027-01": 4 }, SISTEMA);
    expect(p.meses).toHaveLength(6);
    expect(p.meses[3].novosClientes).toBe(0);
    // E continua custando dinheiro.
    expect(p.meses[3].custoTotal).toBeGreaterThan(0);
  });
});

describe("clientesParaChegarA", () => {
  it("arredonda para cima e nunca devolve negativo", () => {
    expect(clientesParaChegarA(31169.27, 14450, 2000)).toBe(9);
    expect(clientesParaChegarA(10000, 14450, 2000)).toBe(0);
    expect(clientesParaChegarA(30000, 14450, 0)).toBeNull();
  });
});
