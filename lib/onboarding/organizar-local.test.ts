import { describe, it, expect } from "vitest";
import { organizarTextoLocal } from "./organizar-local";

describe("organizarTextoLocal", () => {
  it("encaixa rótulos com dois-pontos no campo certo", () => {
    const campos = organizarTextoLocal(
      [
        "Público-alvo: mulheres de 25 a 40 anos",
        "Tom de voz: leve e acolhedor",
        "Objetivo principal: gerar mais agendamentos",
      ].join("\n"),
    );
    expect(campos.publico).toBe("mulheres de 25 a 40 anos");
    expect(campos.tom).toBe("leve e acolhedor");
    expect(campos.objetivo).toBe("gerar mais agendamentos");
  });

  it("aceita rótulo em forma de pergunta e sem acento", () => {
    const campos = organizarTextoLocal("Qual o tom de voz? proximo e divertido");
    expect(campos.tom).toBe("proximo e divertido");
  });

  it("acumula linhas quando o rótulo está sozinho e a resposta vem abaixo", () => {
    const campos = organizarTextoLocal(
      ["Pilares de conteúdo", "- Bastidores", "- Dicas", "- Depoimentos"].join(
        "\n",
      ),
    );
    expect(campos.pilares).toBe("- Bastidores\n- Dicas\n- Depoimentos");
  });

  it("captura o @ do instagram mesmo sem rótulo", () => {
    const campos = organizarTextoLocal("Segue a gente no @minha.marca ok?");
    expect(campos.instagram).toBe("@minha.marca");
  });

  it("joga texto sem rótulo em 'sobre'", () => {
    const campos = organizarTextoLocal(
      "Clínica de estética focada em procedimentos faciais na zona sul.",
    );
    expect(campos.sobre).toContain("Clínica de estética");
  });

  it("não confunde o alias curto '@' como rótulo de linha comum", () => {
    const campos = organizarTextoLocal("Marca: Studio Bella");
    expect(campos.marca).toBe("Studio Bella");
  });

  it("devolve objeto vazio para texto irrelevante em branco", () => {
    const campos = organizarTextoLocal("   \n  \n");
    expect(Object.keys(campos)).toHaveLength(0);
  });

  describe("CSV do Google Forms", () => {
    const csv = [
      '"Carimbo de data/hora","Nome completo","Acesso para o Instagram - Login e senha","Qual é a principal dor da empresa que te contrata hoje?","Tom de voz para o conteúdo","O que você NÃO quer no seu conteúdo? (estética, tom, temas)","Possui identidade visual (logo, brand guide)?"',
      '"2026/08/12","Izabela Schipitoski","login: iza\nsenha: segredo123","Líderes despreparados","Educativo e técnico","Estética muito escura","Sim, tenho logo"',
    ].join("\n");

    it("mapeia perguntas do formulário nos campos por palavra-chave", () => {
      const campos = organizarTextoLocal(csv);
      expect(campos.marca).toBe("Izabela Schipitoski");
      expect(campos.dores).toBe("Líderes despreparados");
      expect(campos.tom).toBe("Educativo e técnico");
      expect(campos.evitar).toBe("Estética muito escura");
      expect(campos.estilo).toBe("Sim, tenho logo");
    });

    it("nunca importa colunas de acesso/senha", () => {
      const campos = organizarTextoLocal(csv);
      const tudo = JSON.stringify(campos).toLowerCase();
      expect(tudo).not.toContain("senha");
      expect(tudo).not.toContain("segredo123");
    });

    it("não deixa o @ de concorrentes virar o instagram do cliente", () => {
      const c = [
        '"Carimbo de data/hora","Nome completo","Cidade","Segmento","Concorrentes diretos"',
        '"2026/08/12","Fulana","São Paulo","Estética","@rival1 @rival2"',
      ].join("\n");
      const campos = organizarTextoLocal(c);
      expect(campos.concorrentes).toBe("@rival1 @rival2");
      expect(campos.instagram).toBeUndefined();
    });
  });
});
