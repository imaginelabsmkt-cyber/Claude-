import { describe, expect, it } from "vitest";
import {
  paraCampoDeReuniao,
  quandoEhAReuniao,
  reuniaoPassou,
} from "./reuniao";

/** Terça, 10 de novembro de 2026, 9h da manhã. */
const AGORA = new Date(2026, 10, 10, 9, 0);
const em = (dia: number, h = 0, m = 0) => new Date(2026, 10, dia, h, m).toISOString();

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

describe("paraCampoDeReuniao", () => {
  it("devolve o formato que o campo entende", () => {
    expect(paraCampoDeReuniao(em(12, 16, 5))).toBe("2026-11-12T16:05");
  });

  it("vazio quando não há reunião", () => {
    expect(paraCampoDeReuniao(null)).toBe("");
  });
});
