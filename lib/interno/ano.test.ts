import { describe, expect, it } from "vitest";
import {
  escalaDeSaldo,
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
    saldoFinal: 0,
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
    expect(tetoDoEixo([1_050])).toBe(1_250);
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

describe("a linha do caixa", () => {
  it("só tem ponto nos meses que existem na série", () => {
    const ano = faturamentoAnual(2026, [
      mes("2026-04", { receitas: 1_000, saldoFinal: 5_000 }),
      mes("2026-05", { receitas: 1_000, saldoFinal: 6_200 }),
    ]);

    // Doze barras, dois pontos. Inventar janeiro com saldo zero
    // desenharia uma queda ao chão que nunca aconteceu.
    expect(ano.barras).toHaveLength(12);
    expect(ano.pontos).toEqual([
      { mes: "2026-04", saldo: 5_000 },
      { mes: "2026-05", saldo: 6_200 },
    ]);
  });

  it("deixa os pontos em ordem de mês, venha a série como vier", () => {
    const ano = faturamentoAnual(2026, [
      mes("2026-05", { saldoFinal: 6_200 }),
      mes("2026-03", { saldoFinal: 4_000 }),
      mes("2026-04", { saldoFinal: 5_000 }),
    ]);

    expect(ano.pontos.map((p) => p.mes)).toEqual([
      "2026-03",
      "2026-04",
      "2026-05",
    ]);
  });

  it("não traz ponto de outro ano", () => {
    const ano = faturamentoAnual(2026, [
      mes("2025-12", { saldoFinal: 99_000 }),
      mes("2026-01", { saldoFinal: 1_000 }),
    ]);

    expect(ano.pontos).toEqual([{ mes: "2026-01", saldo: 1_000 }]);
  });
});

describe("escalaDeSaldo", () => {
  it("começa no zero quando o caixa nunca ficou negativo", () => {
    expect(escalaDeSaldo([5_000, 11_923.38])).toEqual({
      min: 0,
      max: 12_500,
      marcas: [0, 6_250, 12_500],
    });
  });

  it("abre espaço abaixo do zero quando o caixa ficou negativo", () => {
    const escala = escalaDeSaldo([5_000, -2_200]);

    expect(escala.max).toBe(5_000);
    expect(escala.min).toBe(-2_500);
    // O zero é sempre uma linha desenhada: é a diferença entre estar
    // acima e abaixo dele que importa.
    expect(escala.marcas).toEqual([-2_500, 0, 5_000]);
  });

  it("não devolve altura zero quando está tudo zerado", () => {
    const escala = escalaDeSaldo([0, 0]);
    expect(escala.max).toBeGreaterThan(escala.min);
  });

  it("não devolve altura zero com a lista vazia", () => {
    const escala = escalaDeSaldo([]);
    expect(escala.max).toBeGreaterThan(escala.min);
  });
});
