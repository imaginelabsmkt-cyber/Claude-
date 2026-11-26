import { describe, expect, it } from "vitest";
import {
  ehAdiantada,
  oQueFaltaNoFunil,
  resumoDoFunil,
  type OportunidadeDoFunil,
} from "@/lib/metas/funil";

/* As quatro oportunidades que estão no comercial da Favie. */
const FUNIL: OportunidadeDoFunil[] = [
  { id: "1", name: "Dra. Ana Gessyca", stage: "Negociação", estimated_monthly: 2000 },
  { id: "2", name: "Vértice Arquitetura", stage: "Proposta apresentada", estimated_monthly: 2000 },
  { id: "3", name: "Dra. Bruna Arantes", stage: "Primeiro contato", estimated_monthly: 2000 },
  { id: "4", name: "Rafaela Nutricionista", stage: "Negociação", estimated_monthly: 2000 },
];

describe("o retrato do funil", () => {
  const r = resumoDoFunil(FUNIL);

  it("soma as abertas e o que elas valem", () => {
    expect(r.quantas).toBe(4);
    expect(r.valor).toBe(8000);
    expect(r.ticketMedio).toBe(2000);
  });

  it("separa as que já passaram da reunião", () => {
    /* Contar um "Novo lead" frio como receita quase certa é o jeito
       mais rápido de a projeção mentir. */
    expect(r.quantasAdiantadas).toBe(3);
    expect(r.valorAdiantado).toBe(6000);
  });

  it("toda etapa aberta aparece, mesmo vazia", () => {
    // Um funil com buraco no meio é informação.
    const vazias = r.porEtapa.filter((e) => e.quantas === 0).map((e) => e.etapa);
    expect(vazias).toContain("Novo lead");
    expect(vazias).toContain("Diagnóstico");
    expect(r.porEtapa.some((e) => e.etapa === "Negociação" && e.quantas === 2)).toBe(true);
  });

  it("não conta quem já fechou nem quem não fechou", () => {
    const comEncerradas = resumoDoFunil([
      ...FUNIL,
      { id: "5", name: "Studio Salte", stage: "Fechado", estimated_monthly: 1300 },
      { id: "6", name: "Alguém", stage: "Perdido", estimated_monthly: 5000 },
    ]);
    expect(comEncerradas.quantas).toBe(4);
    expect(comEncerradas.valor).toBe(8000);
    expect(comEncerradas.porEtapa.some((e) => e.etapa === "Fechado")).toBe(false);
  });

  it("oportunidade sem valor não derruba o ticket médio", () => {
    const r2 = resumoDoFunil([
      ...FUNIL,
      { id: "7", name: "Sem valor", stage: "Novo lead", estimated_monthly: 0 },
    ]);
    expect(r2.quantas).toBe(5);
    expect(r2.ticketMedio).toBe(2000);
  });

  it("funil vazio não inventa número", () => {
    const v = resumoDoFunil([]);
    expect(v.quantas).toBe(0);
    expect(v.valor).toBe(0);
    expect(v.ticketMedio).toBeNull();
    expect(v.porEtapa.every((e) => e.quantas === 0)).toBe(true);
  });

  it("sabe quais etapas estão adiantadas", () => {
    expect(ehAdiantada("Negociação")).toBe(true);
    expect(ehAdiantada("Proposta apresentada")).toBe(true);
    expect(ehAdiantada("Reunião marcada")).toBe(true);
    expect(ehAdiantada("Novo lead")).toBe(false);
    expect(ehAdiantada("Diagnóstico")).toBe(false);
  });
});

describe("o funil cobre o que a projeção pede?", () => {
  const r = resumoDoFunil(FUNIL);

  it("diz quantos faltam arrumar além do que já está em jogo", () => {
    // A projeção pede 12 clientes novos e o funil tem 4.
    expect(oQueFaltaNoFunil(r, 12)).toEqual({ cobre: false, faltam: 8 });
  });

  it("cobre quando o funil dá conta", () => {
    expect(oQueFaltaNoFunil(r, 4)).toEqual({ cobre: true, faltam: 0 });
    expect(oQueFaltaNoFunil(r, 2)).toEqual({ cobre: true, faltam: 0 });
  });

  it("nunca devolve negativo", () => {
    expect(oQueFaltaNoFunil(r, 0).faltam).toBe(0);
  });
});
