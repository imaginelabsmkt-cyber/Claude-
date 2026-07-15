import { describe, it, expect } from "vitest";
import { parsePlanejamento } from "@/lib/import/planning-parser";

// Amostra no formato real da Vitória (documento verticalizado).
const AMOSTRA = `
PLANEJAMENTO BEATRIZ JULHO
###########################################
SEMANA 1
###########################################
CONTEÚDO 1:REELS PROTOCOLO COM AMIGAS
DATA DA POSTAGEM:05/07 (DOMINGO)
LOCAL:CLÍNICA/ CAFETERIA
VESTIMENTA: UM LOOK BEM ESTRUTURADO
Aqui vem o roteiro, cenas, falas...
LEGENDA: qualquer coisa
###########################################
CONTEÚDO 2: TREND VAMOS FAZER O QUE ?
DATA DA POSTAGEM: 08/07 (QUARTA-FEIRA)
LOCAL:CLÍNICA
REFERÊNCIA: https://www.tiktok.com/@ju.xavier/video/7626061129600519431
OBS: PRECISAMOS DE DUAS MODELOS
###########################################
SEMANA 2
###########################################
CONTEÚDO 3: CARROSSEL O PODER DA ESTÉTICA
DATA DA POSTAGEM:14/07(TERÇA-FEIRA)
CARD 1
TÍTULO: O poder da ESTÉTICA
`;

describe("parsePlanejamento", () => {
  const itens = parsePlanejamento(AMOSTRA, 2026);

  it("detecta a quantidade certa de conteúdos", () => {
    expect(itens.length).toBe(3);
  });

  it("extrai título, formato e semana do primeiro (Reel)", () => {
    expect(itens[0].titulo).toBe("Protocolo com amigas");
    expect(itens[0].formato).toBe("Reel");
    expect(itens[0].semana).toBe(1);
    expect(itens[0].dataPrevista).toBe("2026-07-05");
    expect(itens[0].precisaGravacao).toBe(true);
    expect(itens[0].local).toBe("CLÍNICA/ CAFETERIA");
  });

  it("reconhece TREND como Reel e captura o link de referência", () => {
    expect(itens[1].formato).toBe("Reel");
    expect(itens[1].titulo).toBe("Vamos fazer o que ?");
    expect(itens[1].dataPrevista).toBe("2026-07-08");
    expect(itens[1].link).toContain("tiktok.com");
    expect(itens[1].observacoes).toBe("PRECISAMOS DE DUAS MODELOS");
  });

  it("reconhece Carrossel (sem gravação) e a semana 2", () => {
    expect(itens[2].formato).toBe("Carrossel");
    expect(itens[2].titulo).toBe("O poder da estética");
    expect(itens[2].semana).toBe(2);
    expect(itens[2].precisaGravacao).toBe(false);
    expect(itens[2].dataPrevista).toBe("2026-07-14");
  });
});
