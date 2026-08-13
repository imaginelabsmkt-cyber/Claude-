import { describe, it, expect } from "vitest";
import { parsePlanejamento, COL_DELIM } from "@/lib/import/planning-parser";

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
    expect(itens[0].titulo).toBe("Protocolo com Amigas");
    expect(itens[0].formato).toBe("Reel");
    expect(itens[0].semana).toBe(1);
    expect(itens[0].dataPrevista).toBe("2026-07-05");
    expect(itens[0].precisaGravacao).toBe(true);
    expect(itens[0].local).toBe("CLÍNICA/ CAFETERIA");
  });

  it("captura o roteiro e a legenda do conteúdo", () => {
    expect(itens[0].roteiro).toContain("Aqui vem o roteiro");
    expect(itens[0].legenda).toBe("qualquer coisa");
  });

  it("reconhece TREND como Reel e captura o link de referência", () => {
    expect(itens[1].formato).toBe("Reel");
    expect(itens[1].titulo).toBe("Vamos Fazer o que ?");
    expect(itens[1].dataPrevista).toBe("2026-07-08");
    expect(itens[1].link).toContain("tiktok.com");
    expect(itens[1].observacoes).toBe("PRECISAMOS DE DUAS MODELOS");
  });

  it("reconhece Carrossel (sem gravação) e a semana 2", () => {
    expect(itens[2].formato).toBe("Carrossel");
    expect(itens[2].titulo).toBe("O Poder da Estética");
    expect(itens[2].semana).toBe(2);
    expect(itens[2].precisaGravacao).toBe(false);
    expect(itens[2].dataPrevista).toBe("2026-07-14");
  });

  it("detecta o formato só pela primeira palavra (não se confunde com o título)", () => {
    const r = parsePlanejamento(
      "CONTEÚDO 1: REELS sobre vídeo de bastidores no carrossel de fotos",
      2026,
    );
    expect(r[0].formato).toBe("Reel");
    expect(r[0].precisaGravacao).toBe(true);
  });

  it("rejeita datas inválidas em vez de gerar ISO quebrado", () => {
    const r = parsePlanejamento(
      "CONTEÚDO 1: REELS teste\nDATA DA POSTAGEM: 45/13",
      2026,
    );
    expect(r[0].dataPrevista).toBeNull();
  });

  it("aceita rótulo de referência com parêntese (Instagram / TikTok)", () => {
    const r = parsePlanejamento(
      "CONTEÚDO 1: REELS teste\nReferência (Instagram / TikTok): https://www.instagram.com/reel/abc123/",
      2026,
    );
    expect(r[0].link).toBe("https://www.instagram.com/reel/abc123/");
  });

  it("preserva as colunas da tabela do roteiro (COL_DELIM)", () => {
    const r = parsePlanejamento(
      `CONTEÚDO 1: REELS teste\n` +
        `FALA${COL_DELIM}CENAS\n` +
        `FALA X: oi${COL_DELIM}cena de abertura\n` +
        `LEGENDA: minha legenda`,
      2026,
    );
    const linhas = (r[0].roteiro ?? "").split("\n");
    expect(linhas[0]).toBe(`FALA${COL_DELIM}CENAS`);
    expect(linhas[1]).toBe(`FALA X: oi${COL_DELIM}cena de abertura`);
    expect(r[0].legenda).toBe("minha legenda");
  });

  it("captura link de referência solto (sem rótulo) e não polui o roteiro", () => {
    const r = parsePlanejamento(
      "CONTEÚDO 1: REELS teste\nhttps://vm.tiktok.com/ZMabc/\nCena de abertura",
      2026,
    );
    expect(r[0].link).toContain("tiktok.com");
    expect(r[0].roteiro ?? "").not.toContain("tiktok.com");
    expect(r[0].roteiro ?? "").toContain("Cena de abertura");
  });
});
