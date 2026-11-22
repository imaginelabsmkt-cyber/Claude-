import { describe, expect, it } from "vitest";
import {
  ETAPAS,
  ETAPAS_ABERTAS,
  etapa,
  proximoContatoSugerido,
} from "./etapas";
import { LEAD_STAGE_OPTIONS } from "@/types";

describe("as etapas do funil", () => {
  it("cobre exatamente as etapas que o banco conhece", () => {
    // Se alguém adicionar uma etapa no enum e esquecer aqui, a pessoa
    // vê uma coluna sem descrição e sem prazo de follow-up.
    expect(ETAPAS.map((e) => e.id).sort()).toEqual(
      [...LEAD_STAGE_OPTIONS].sort(),
    );
  });

  it("as abertas são todas menos Fechado e Perdido", () => {
    expect(ETAPAS_ABERTAS).toEqual([
      "Novo lead",
      "Primeiro contato",
      "Em conversa",
      "Diagnóstico",
      "Reunião marcada",
      "Proposta apresentada",
      "Negociação",
    ]);
  });

  it("mantém as duas correções da Fran", () => {
    // "A gente não envia a proposta, apresenta na reunião."
    expect(ETAPAS.some((e) => e.id === "Proposta apresentada")).toBe(true);
    // "O diagnóstico a gente faz antes de encontrar o cliente."
    const ids = ETAPAS.map((e) => e.id);
    expect(ids.indexOf("Diagnóstico")).toBeLessThan(
      ids.indexOf("Reunião marcada"),
    );
  });
});

describe("proximoContatoSugerido", () => {
  it("usa o prazo de cada etapa", () => {
    expect(proximoContatoSugerido("Novo lead", "2026-11-22")).toBe("2026-11-22");
    expect(proximoContatoSugerido("Primeiro contato", "2026-11-22")).toBe(
      "2026-11-23",
    );
    expect(proximoContatoSugerido("Negociação", "2026-11-22")).toBe(
      "2026-11-25",
    );
  });

  it("atravessa a virada do mês", () => {
    expect(proximoContatoSugerido("Negociação", "2026-11-30")).toBe(
      "2026-12-03",
    );
  });

  it("não marca contato onde a data vem de outro lugar", () => {
    // A reunião tem a data dela; fechado e perdido não têm próximo.
    expect(proximoContatoSugerido("Reunião marcada", "2026-11-22")).toBeNull();
    expect(proximoContatoSugerido("Fechado", "2026-11-22")).toBeNull();
    expect(proximoContatoSugerido("Perdido", "2026-11-22")).toBeNull();
  });

  it("data estragada não vira data de contato", () => {
    expect(proximoContatoSugerido("Novo lead", "não é data")).toBeNull();
  });
});

describe("etapa", () => {
  it("toda etapa tem descrição e o que fazer", () => {
    for (const e of ETAPAS) {
      expect(etapa(e.id).descricao.length, e.id).toBeGreaterThan(10);
      expect(etapa(e.id).oQueFazer.length, e.id).toBeGreaterThan(10);
    }
  });
});
