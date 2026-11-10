import { describe, expect, it } from "vitest";
import { somar } from "./somadora";

describe("somadora", () => {
  it("soma o caso da Fran: o que mandar para a Vitória", () => {
    // Pró-labore + mentoria + iCloud dela.
    const r = somar("6500\n2166,70\n66,90");
    expect(r.total).toBe(8733.6);
    expect(r.parcelas).toHaveLength(3);
  });

  it("aceita os separadores que uma pessoa usa", () => {
    expect(somar("100 + 200").total).toBe(300);
    expect(somar("100; 200").total).toBe(300);
    expect(somar("100\n200").total).toBe(300);
    expect(somar("100, 200").total).toBe(300);
  });

  it("não confunde a vírgula decimal com separador", () => {
    expect(somar("1,50 + 2,50").total).toBe(4);
    expect(somar("2.166,70 + 66,90").total).toBe(2233.6);
  });

  it("entende o jeito que o sistema escreve dinheiro", () => {
    expect(somar("R$ 6.500,00\nR$ 66,90").total).toBe(6566.9);
  });

  it("devolve o que não entendeu em vez de somar errado", () => {
    const r = somar("6500\npró-labore\n66,90");
    expect(r.total).toBe(6566.9);
    expect(r.ignorados).toEqual(["pró-labore"]);
  });

  it("texto vazio soma zero", () => {
    expect(somar("").total).toBe(0);
    expect(somar("   \n  ").parcelas).toHaveLength(0);
  });

  it("soma negativo, para quando um pedaço volta", () => {
    expect(somar("1000\n-150").total).toBe(850);
  });
});
