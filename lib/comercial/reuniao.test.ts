import { describe, expect, it } from "vitest";
import {
  instanteDaReuniao,
  paraCampoDeReuniao,
  quandoEhAReuniao,
  reuniaoPassou,
} from "./reuniao";

/**
 * Tudo em BOA VISTA (UTC-4, sem horário de verão). Os instantes são
 * escritos com o fuso na mão, de propósito: se estes testes passassem
 * a depender do relógio da máquina, voltariam a falhar só no servidor,
 * que é exatamente o erro que esta versão existe para matar.
 */
const em = (dia: number, h = 0, m = 0) =>
  `2026-11-${String(dia).padStart(2, "0")}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00-04:00`;

/** Terça, 10 de novembro de 2026, 9h da manhã em Boa Vista. */
const AGORA = new Date(em(10, 9));

describe("quandoEhAReuniao", () => {
  it("hoje e amanhã viram palavra, com a hora", () => {
    expect(quandoEhAReuniao(em(10, 14), AGORA)).toBe("hoje 14h");
    expect(quandoEhAReuniao(em(11, 9, 30), AGORA)).toBe("amanhã 9h30");
  });

  it("dentro da semana, o dia da semana", () => {
    // 12/11/2026 é uma quinta.
    expect(quandoEhAReuniao(em(12, 16), AGORA)).toBe("quinta 16h");
  });

  it("longe, a data miúda", () => {
    expect(quandoEhAReuniao(em(25, 10), AGORA)).toBe("25/nov");
  });

  it("meia-noite em ponto não escreve hora", () => {
    // Quem marcou só o dia não escolheu 0h: não inventa hora na tela.
    expect(quandoEhAReuniao(em(12), AGORA)).toBe("quinta");
  });

  it("o que já passou diz que passou", () => {
    expect(quandoEhAReuniao(em(9, 15), AGORA)).toBe("foi ontem");
    expect(quandoEhAReuniao(em(7, 15), AGORA)).toBe("foi há 3 dias");
  });

  it("NÃO depende do fuso de quem lê", () => {
    // Uma reunião às 22h de Boa Vista é 02h do dia SEGUINTE em UTC.
    // Lido em UTC, isto viraria "amanhã 2h" — o erro que esta função
    // existe para não cometer. Em Boa Vista é hoje, às 22h.
    expect(quandoEhAReuniao(em(10, 22), AGORA)).toBe("hoje 22h");
  });

  it("data inválida não quebra a tela", () => {
    expect(quandoEhAReuniao("nada disso", AGORA)).toBe("");
  });
});

describe("reuniaoPassou", () => {
  it("compara o instante, não o dia", () => {
    expect(reuniaoPassou(em(10, 8), AGORA)).toBe(true);
    expect(reuniaoPassou(em(10, 10), AGORA)).toBe(false);
  });

  it("sem reunião marcada, não passou nada", () => {
    expect(reuniaoPassou(null, AGORA)).toBe(false);
  });
});

describe("ida e volta do campo", () => {
  it("devolve o formato que o campo entende, em Boa Vista", () => {
    expect(paraCampoDeReuniao(em(12, 16, 5))).toBe("2026-11-12T16:05");
  });

  it("o que o campo devolve vira o MESMO instante", () => {
    const instante = new Date(em(12, 16, 5)).toISOString();
    expect(instanteDaReuniao("2026-11-12T16:05")).toBe(instante);
    // E de volta, sem perder nada pelo caminho.
    expect(paraCampoDeReuniao(instante)).toBe("2026-11-12T16:05");
  });

  it("vazio dos dois lados", () => {
    expect(paraCampoDeReuniao(null)).toBe("");
    expect(instanteDaReuniao("")).toBeNull();
    expect(instanteDaReuniao(null)).toBeNull();
  });

  it("texto que não é data vira nada, e não data inválida", () => {
    expect(instanteDaReuniao("ontem de tarde")).toBeNull();
  });
});
