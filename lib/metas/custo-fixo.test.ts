import { describe, expect, it } from "vitest";
import {
  custoFixoDoMes,
  custoFixoPorMes,
  oQueAcabaNaJanela,
  valeNoMes,
  type ContaFixa,
} from "@/lib/metas/custo-fixo";

function conta(over: Partial<ContaFixa> & { description?: string } = {}) {
  return {
    kind: "Despesa",
    amount: 100,
    active: true,
    start_month: "2026-01",
    end_month: null,
    ...over,
  } as ContaFixa & { description?: string };
}

describe("quando uma conta fixa vale", () => {
  it("não vale antes de começar", () => {
    expect(valeNoMes(conta({ start_month: "2027-03" }), "2027-02")).toBe(false);
    expect(valeNoMes(conta({ start_month: "2027-03" }), "2027-03")).toBe(true);
  });

  it("vale ATÉ o mês de fim, inclusive", () => {
    const c = conta({ end_month: "2027-02" });
    expect(valeNoMes(c, "2027-02")).toBe(true);
    expect(valeNoMes(c, "2027-03")).toBe(false);
  });

  it("sem fim, vale para sempre", () => {
    expect(valeNoMes(conta(), "2030-12")).toBe(true);
  });

  it("pausada não vale nunca", () => {
    expect(valeNoMes(conta({ active: false }), "2027-01")).toBe(false);
  });
});

describe("o custo fixo do mês", () => {
  /* O caso de verdade: a mentoria Ultralize acaba em fevereiro/27, e
     é por isso que a planilha tinha dois números escritos à mão. */
  const CONTAS = [
    conta({ description: "Pró-labore Fran", amount: 6500 }),
    conta({ description: "Pró-labore Vitória", amount: 6500 }),
    conta({ description: "Mentoria Ultralize", amount: 2166.7, end_month: "2027-02" }),
    conta({ description: "Claude Max", amount: 454.1 }),
    conta({ description: "Mensalidade Kiku", amount: 2200, kind: "Receita" }),
  ];

  it("soma só as despesas que valem naquele mês", () => {
    expect(custoFixoDoMes(CONTAS, "2027-01")).toBeCloseTo(15620.8, 2);
    // Em março a mentoria já saiu.
    expect(custoFixoDoMes(CONTAS, "2027-03")).toBeCloseTo(13454.1, 2);
  });

  it("não soma receita no custo fixo", () => {
    // Senão o "custo fixo" sairia menor, ou até negativo.
    const semReceita = CONTAS.filter((c) => c.kind === "Despesa");
    expect(custoFixoDoMes(CONTAS, "2027-01")).toBe(
      custoFixoDoMes(semReceita, "2027-01"),
    );
  });

  it("monta o mapa mês a mês, com o degrau no lugar certo", () => {
    const mapa = custoFixoPorMes(CONTAS, "2027-01", 4);
    expect(Object.keys(mapa)).toEqual([
      "2027-01", "2027-02", "2027-03", "2027-04",
    ]);
    expect(mapa["2027-02"]).toBeCloseTo(15620.8, 2);
    expect(mapa["2027-03"]).toBeCloseTo(13454.1, 2);
    expect(mapa["2027-02"] - mapa["2027-03"]).toBeCloseTo(2166.7, 2);
  });

  it("mês sem nenhuma conta dá zero, não erro", () => {
    expect(custoFixoDoMes([], "2027-01")).toBe(0);
  });
});

describe("o que acaba dentro da janela", () => {
  const CONTAS = [
    conta({ description: "Mentoria Ultralize", amount: 2166.7, end_month: "2027-02" }),
    conta({ description: "Assinatura antiga", amount: 99, end_month: "2026-06" }),
    conta({ description: "Claude Max", amount: 454.1 }),
    conta({ description: "Contrato longo", amount: 300, end_month: "2029-01" }),
  ];

  it("lista só o que acaba na janela, com mês e valor", () => {
    const r = oQueAcabaNaJanela(CONTAS, "2027-01", 6);
    expect(r).toHaveLength(1);
    expect(r[0].descricao).toBe("Mentoria Ultralize");
    expect(r[0].mes).toBe("2027-02");
    expect(r[0].valor).toBeCloseTo(2166.7, 2);
  });

  it("o que já acabou antes da janela não entra", () => {
    expect(
      oQueAcabaNaJanela(CONTAS, "2027-01", 6).some(
        (x) => x.descricao === "Assinatura antiga",
      ),
    ).toBe(false);
  });

  it("o que não acaba na janela não entra", () => {
    const nomes = oQueAcabaNaJanela(CONTAS, "2027-01", 6).map((x) => x.descricao);
    expect(nomes).not.toContain("Claude Max");
    expect(nomes).not.toContain("Contrato longo");
  });
});
