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
    valorPorUnidade: null,
    tetoDeUnidades: null,
    mesDeInicio: "2027-04",
    ativa: true,
    clt: true,
    ...over,
  };
}

/*
 * A equipe da planilha da Vitória, com os números que ela atualizou:
 * cinco formas de pagar, e três delas por unidade.
 */
const EQUIPE: Contratacao[] = [
  pessoa({ id: "editor", cargo: "Editor", forma: "por_video_editado",
    custoMensal: null, valorPorUnidade: 50, tetoDeUnidades: 50,
    mesDeInicio: "2027-03", clt: false }),
  pessoa({ id: "videomaker", cargo: "Videomaker", forma: "por_video_gravado",
    custoMensal: null, valorPorUnidade: 60, tetoDeUnidades: 45,
    mesDeInicio: "2027-03", clt: false }),
  pessoa({ id: "cs", cargo: "CS", mesDeInicio: "2027-04" }),
  pessoa({ id: "social", cargo: "Social media", forma: "por_cliente",
    custoMensal: null, valorPorUnidade: 200, tetoDeUnidades: 10,
    mesDeInicio: "2027-05", clt: false }),
  pessoa({ id: "advogado", cargo: "Advogado", forma: "uma_vez",
    custoMensal: 3000, mesDeInicio: "2027-02", clt: false }),
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
    expect(custoDaPessoa(pessoa(), "2027-03", PREMISSAS, 73, 16)).toBe(0);
    expect(custoDaPessoa(pessoa(), "2027-04", PREMISSAS, 81, 18)).toBe(2800);
  });

  it("CLT soma os encargos; PJ não", () => {
    // R$ 2.000 + 40% = R$ 2.800, como na planilha.
    expect(custoDaPessoa(pessoa({ clt: true }), "2027-04", PREMISSAS, 81, 18)).toBe(2800);
    expect(custoDaPessoa(pessoa({ clt: false }), "2027-04", PREMISSAS, 81, 18)).toBe(2000);
  });

  it("o editor para no teto de vídeos dele", () => {
    const editor = pessoa({
      forma: "por_video_editado", mesDeInicio: "2027-03",
      custoMensal: null, valorPorUnidade: 50, tetoDeUnidades: 50,
    });
    // 73 vídeos, teto de 50: paga 50 × R$ 50 = R$ 2.500.
    expect(custoDaPessoa(editor, "2027-03", PREMISSAS, 73, 16)).toBe(2500);
    // 30 vídeos: paga os 30.
    expect(custoDaPessoa(editor, "2027-03", PREMISSAS, 30, 16)).toBe(1500);
  });

  it("o videomaker é pago pelo que GRAVA, não pelo que o editor edita", () => {
    /* Os dois tocam no mesmo vídeo. Na primeira versão eu tinha as
       duas como "por vídeo" e a conta pagaria duas vezes pela mesma
       coisa. */
    const vm = pessoa({
      forma: "por_video_gravado", mesDeInicio: "2027-03",
      custoMensal: null, valorPorUnidade: 60, tetoDeUnidades: 45,
    });
    // 89 vídeos, teto de 45: 45 × R$ 60 = R$ 2.700, como na planilha.
    expect(custoDaPessoa(vm, "2027-05", PREMISSAS, 89, 20)).toBe(2700);
  });

  it("a social media é paga por CLIENTE, não por vídeo", () => {
    const sm = pessoa({
      forma: "por_cliente", mesDeInicio: "2027-05",
      custoMensal: null, valorPorUnidade: 200, tetoDeUnidades: 10,
    });
    // 20 clientes, teto de 10: 10 × R$ 200 = R$ 2.000.
    expect(custoDaPessoa(sm, "2027-05", PREMISSAS, 89, 20)).toBe(2000);
    // Com 6 clientes, paga os 6.
    expect(custoDaPessoa(sm, "2027-05", PREMISSAS, 30, 6)).toBe(1200);
  });

  it("o advogado custa NUM MÊS SÓ", () => {
    /* Ele revisa os contratos uma vez e acabou. Somar todo mês
       inflaria o custo da projeção inteira. */
    const adv = pessoa({ forma: "uma_vez", custoMensal: 3000, mesDeInicio: "2027-02", clt: false });
    expect(custoDaPessoa(adv, "2027-02", PREMISSAS, 65, 14)).toBe(3000);
    expect(custoDaPessoa(adv, "2027-03", PREMISSAS, 73, 16)).toBe(0);
    expect(custoDaPessoa(adv, "2027-01", PREMISSAS, 57, 12)).toBe(0);
  });

  it("desmarcada não custa nada, sem precisar apagar", () => {
    expect(custoDaPessoa(pessoa({ ativa: false }), "2027-06", PREMISSAS, 89, 20)).toBe(0);
  });

  it("mensal sem valor conta zero, e a projeção avisa", () => {
    // É o videomaker: a Fran disse quando e para quê, não quanto.
    const vm = pessoa({ custoMensal: null, clt: false });
    expect(custoDaPessoa(vm, "2027-06", PREMISSAS, 89, 20)).toBe(0);
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

  it("cada pessoa entra no mês dela, e pela forma dela", () => {
    // Editor: 50 vídeos × R$ 50, de março em diante.
    expect(p.meses.map((m) => m.custoDasPessoas.editor)).toEqual([
      0, 0, 2500, 2500, 2500, 2500,
    ]);
    // Videomaker: 45 vídeos GRAVADOS × R$ 60, também de março.
    expect(p.meses.map((m) => m.custoDasPessoas.videomaker)).toEqual([
      0, 0, 2700, 2700, 2700, 2700,
    ]);
    // CS: salário CLT, R$ 2.000 + 40%, de abril.
    expect(p.meses.map((m) => m.custoDasPessoas.cs)).toEqual([
      0, 0, 0, 2800, 2800, 2800,
    ]);
    // Social media: 10 clientes × R$ 200, de maio.
    expect(p.meses.map((m) => m.custoDasPessoas.social)).toEqual([
      0, 0, 0, 0, 2000, 2000,
    ]);
    // Advogado: num mês SÓ.
    expect(p.meses.map((m) => m.custoDasPessoas.advogado)).toEqual([
      0, 3000, 0, 0, 0, 0,
    ]);
  });

  it("o custo de maio bate com o total da planilha", () => {
    /* R$ 24.569,27: custo fixo 14.055,32 + imposto 513,95 + editor
       2.500 + CS 2.800 + social 2.000 + videomaker 2.700. */
    expect(p.meses[4].custoTotal).toBeCloseTo(24569.27, 2);
  });

  it("o editor leva 50 vídeos para editar e o resto fica com a Fran", () => {
    // Antes dele entrar, tudo é da Fran.
    expect(p.meses[0].videosComOEditor).toBe(0);
    expect(p.meses[0].videosComAFran).toBe(57);
    // De março em diante, 50 com ele.
    expect(p.meses[2].videosComOEditor).toBe(50);
    expect(p.meses[2].videosComAFran).toBe(23);
    expect(p.meses[4].videosComAFran).toBe(39);
  });

  it("o videomaker leva 45 para gravar, e isso é outra conta", () => {
    /* Os 89 vídeos de maio passam pelos dois: 45 o videomaker grava e
       50 o editor edita. Não são 95 vídeos. */
    expect(p.meses[4].videos).toBe(89);
    expect(p.meses[4].videosComOVideomaker).toBe(45);
    expect(p.meses[4].videosParaAFranGravar).toBe(44);
    expect(p.meses[4].videosComOEditor).toBe(50);
  });

  it("sobra e acumulado batem com a planilha", () => {
    const sobras = p.meses.map((m) => Number(m.sobra.toFixed(2)));
    expect(sobras).toEqual([
      3714.03, 6714.03, 10680.73, 11880.73, 13880.73, 13880.73,
    ]);
    expect(p.guardadoAteAMeta).toBeCloseTo(60750.98, 2);
  });

  it("diz em que mês a meta é batida", () => {
    // 46.870,25 em maio ainda não; 60.750,98 em junho passa dos 50 mil.
    expect(p.mesEmQueBate).toBe("2027-06");
    expect(p.diferencaParaAMeta).toBeCloseTo(10750.98, 2);
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
       acaba, então não se digita duas vezes nem se esquece de
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

describe("a outra conta do imposto: 6% do Simples", () => {
  const p = montarProjecao("2027-01", PREMISSAS, EQUIPE, RITMO, SISTEMA);

  it("antes de sair do MEI, não existe", () => {
    const antes = montarProjecao(
      "2027-01",
      { ...PREMISSAS, mesSaidaDoMei: "2027-04" },
      EQUIPE,
      RITMO,
      SISTEMA,
    );
    expect(antes.meses[0].impostoPeloSimples).toBe(0);
    // E a sobra é a mesma nas duas contas enquanto for MEI.
    expect(antes.meses[0].sobraPeloSimples).toBeCloseTo(antes.meses[0].sobra, 2);
  });

  it("é 6% do faturamento do mês", () => {
    // 38.450 × 6% = 2.307, o número da planilha.
    expect(p.meses[4].impostoPeloSimples).toBeCloseTo(2307, 2);
  });

  it("guarda menos, porque o imposto é maior que o palpite", () => {
    /* R$ 600 estimados contra R$ 2.307 reais: a diferença decide se
       a meta é batida. Por isso as duas contas ficam lado a lado. */
    expect(p.guardadoPeloSimples).toBeLessThan(p.guardadoAteAMeta);
    expect(p.guardadoPeloSimples).toBeCloseTo(52908.98, 2);
  });
});
