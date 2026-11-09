import { describe, expect, it } from "vitest";
import {
  faturamentoAnual,
  marcasDoEixo,
  tetoDoEixo,
  type MesFaturamento,
} from "@/lib/interno/ano";

/** Monta um mês da série com o que o teste precisa; o resto vira zero. */
function mes(
  mes: string,
  valores: Partial<Omit<MesFaturamento, "mes">> = {},
): MesFaturamento {
  return {
    mes,
    receitas: 0,
    despesas: 0,
    receitasPrevistas: 0,
    despesasPrevistas: 0,
    ...valores,
  };
}

describe("faturamentoAnual", () => {
  it("devolve doze meses mesmo quando a série começa no meio do ano", () => {
    const ano = faturamentoAnual(2026, [
      mes("2026-04", { receitas: 1000, receitasPrevistas: 1000 }),
    ]);

    expect(ano.barras).toHaveLength(12);
    expect(ano.barras[0].mes).toBe("2026-01");
    expect(ano.barras[11].mes).toBe("2026-12");
    expect(ano.barras[0].comMovimento).toBe(false);
    expect(ano.barras[3].comMovimento).toBe(true);
  });

  it("soma o faturamento do ano e separa o que ainda falta receber", () => {
    const ano = faturamentoAnual(2026, [
      mes("2026-01", { receitas: 10_000, receitasPrevistas: 12_000 }),
      mes("2026-02", { receitas: 8_000, receitasPrevistas: 8_000 }),
    ]);

    expect(ano.recebido).toBe(18_000);
    expect(ano.previsto).toBe(20_000);
    expect(ano.aReceber).toBe(2_000);
  });

  it("calcula o resultado do ano com o que entrou e saiu de verdade", () => {
    const ano = faturamentoAnual(2026, [
      mes("2026-01", { receitas: 10_000, despesas: 7_000 }),
      mes("2026-02", { receitas: 9_000, despesas: 11_000 }),
    ]);

    expect(ano.pago).toBe(18_000);
    expect(ano.resultado).toBe(1_000);
  });

  it("tira a média só sobre os meses que faturaram", () => {
    const ano = faturamentoAnual(2026, [
      mes("2026-01", { receitas: 12_000 }),
      mes("2026-02", { receitas: 8_000 }),
    ]);

    // 20.000 em dois meses faturados, e não em doze: dividir pelo ano
    // inteiro diria "média de 1.666", que não descreve mês nenhum.
    expect(ano.mesesFaturados).toBe(2);
    expect(ano.mediaMensal).toBe(10_000);
  });

  it("não divide por zero quando nada foi faturado", () => {
    const ano = faturamentoAnual(2026, []);

    expect(ano.recebido).toBe(0);
    expect(ano.mesesFaturados).toBe(0);
    expect(ano.mediaMensal).toBe(0);
    expect(ano.melhorMes).toBeNull();
  });

  it("aponta o melhor mês do ano", () => {
    const ano = faturamentoAnual(2026, [
      mes("2026-01", { receitas: 9_000 }),
      mes("2026-02", { receitas: 13_150 }),
      mes("2026-03", { receitas: 11_000 }),
    ]);

    expect(ano.melhorMes).toEqual({ mes: "2026-02", valor: 13_150 });
  });

  it("não conta um mês que só teve despesa como mês faturado", () => {
    const ano = faturamentoAnual(2026, [
      mes("2026-01", { despesas: 2_000 }),
    ]);

    expect(ano.mesesFaturados).toBe(0);
    expect(ano.barras[0].comMovimento).toBe(true);
  });

  it("ignora meses de outro ano que venham na série", () => {
    const ano = faturamentoAnual(2026, [
      mes("2025-12", { receitas: 50_000 }),
      mes("2026-01", { receitas: 1_000 }),
    ]);

    expect(ano.recebido).toBe(1_000);
  });
});

describe("tetoDoEixo", () => {
  it("é zero quando não há valor nenhum", () => {
    expect(tetoDoEixo([])).toBe(0);
    expect(tetoDoEixo([0, 0])).toBe(0);
  });

  it("arredonda para cima até um número redondo", () => {
    expect(tetoDoEixo([13_147.8])).toBe(15_000);
    expect(tetoDoEixo([8_900])).toBe(10_000);
    expect(tetoDoEixo([1_050])).toBe(1_500);
    expect(tetoDoEixo([2_600])).toBe(3_000);
  });

  it("nunca corta a maior barra", () => {
    for (const valor of [1, 99, 100, 101, 4_999, 13_150, 200_001]) {
      expect(tetoDoEixo([valor])).toBeGreaterThanOrEqual(valor);
    }
  });

  it("usa o maior valor da lista", () => {
    expect(tetoDoEixo([1_000, 13_147.8, 900])).toBe(15_000);
  });
});

describe("marcasDoEixo", () => {
  it("vai do zero ao teto", () => {
    expect(marcasDoEixo(15_000)).toEqual([0, 7_500, 15_000]);
  });

  it("aceita mais divisões", () => {
    expect(marcasDoEixo(15_000, 3)).toEqual([0, 5_000, 10_000, 15_000]);
  });

  it("não inventa marcas quando o teto é zero", () => {
    expect(marcasDoEixo(0)).toEqual([0]);
  });
});
