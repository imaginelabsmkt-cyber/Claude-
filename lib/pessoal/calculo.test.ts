import { describe, expect, it } from "vitest";
import {
  agruparPorCategoriaPessoal,
  fixosAGerar,
  fixosVigentes,
  resumirMesPessoal,
  type FixoPessoal,
  type LancamentoPessoal,
} from "./calculo";

function gasto(
  category: string,
  amount: number,
  paid = true,
): LancamentoPessoal {
  return { kind: "Despesa", category, amount, paid };
}

function receita(amount: number, paid = true): LancamentoPessoal {
  return { kind: "Receita", category: "Pró-labore", amount, paid };
}

describe("resumirMesPessoal", () => {
  it("fecha o mês com entrou, saiu e sobrou", () => {
    const r = resumirMesPessoal([
      receita(6500),
      gasto("Moradia", 1800),
      gasto("Alimentação", 620.5),
    ]);

    expect(r.entrou).toBe(6500);
    expect(r.saiu).toBe(2420.5);
    expect(r.sobrou).toBe(4079.5);
  });

  it("separa o que ainda não aconteceu do que já aconteceu", () => {
    const r = resumirMesPessoal([
      receita(6500),
      gasto("Moradia", 1800, true),
      gasto("Cartão", 900, false),
      receita(500, false),
    ]);

    expect(r.saiu).toBe(1800);
    expect(r.aPagar).toBe(900);
    expect(r.aReceber).toBe(500);
    expect(r.sobrou).toBe(4700);
    // 6500 + 500 − 1800 − 900
    expect(r.sobraPrevista).toBe(4300);
  });

  it("mês vazio não quebra e não divide por zero", () => {
    const r = resumirMesPessoal([]);
    expect(r.entrou).toBe(0);
    expect(r.sobrou).toBe(0);
    expect(r.comprometido).toBe(0);
  });

  it("gasto sem nenhuma receita não vira Infinity", () => {
    const r = resumirMesPessoal([gasto("Moradia", 1800)]);
    expect(r.sobrou).toBe(-1800);
    expect(Number.isFinite(r.comprometido)).toBe(true);
    expect(r.comprometido).toBe(0);
  });

  it("comprometido conta o que vai sair, não só o que saiu", () => {
    const r = resumirMesPessoal([
      receita(1000),
      gasto("Moradia", 400, true),
      gasto("Cartão", 100, false),
    ]);
    expect(r.comprometido).toBeCloseTo(0.5, 10);
  });

  it("não acumula erro de centavo", () => {
    const r = resumirMesPessoal([
      receita(0.1),
      receita(0.2),
      gasto("Café", 0.3),
    ]);
    expect(r.entrou).toBe(0.3);
    expect(r.sobrou).toBe(0);
  });
});

describe("agruparPorCategoriaPessoal", () => {
  it("soma por categoria e ordena pelo maior peso", () => {
    const g = agruparPorCategoriaPessoal([
      gasto("Alimentação", 300),
      gasto("Moradia", 1800),
      gasto("Alimentação", 320.5),
    ]);

    expect(g.map((c) => c.nome)).toEqual(["Moradia", "Alimentação"]);
    expect(g[1].total).toBe(620.5);
    expect(g[1].itens).toBe(2);
  });

  it("'mercado' e 'Mercado' são a mesma linha", () => {
    const g = agruparPorCategoriaPessoal([
      gasto("Mercado", 100),
      gasto("mercado", 50),
      gasto("  MERCADO  ", 25),
    ]);

    expect(g).toHaveLength(1);
    expect(g[0].total).toBe(175);
    // Mostra como foi escrito na primeira vez.
    expect(g[0].nome).toBe("Mercado");
  });

  it("categoria em branco não vira linha sem nome", () => {
    const g = agruparPorCategoriaPessoal([gasto("   ", 40)]);
    expect(g[0].nome).toBe("Sem categoria");
  });

  it("receita não entra no agrupamento de gastos", () => {
    const g = agruparPorCategoriaPessoal([receita(6500), gasto("Moradia", 10)]);
    expect(g).toHaveLength(1);
    expect(g[0].nome).toBe("Moradia");
  });

  it("separa pago de em aberto dentro da mesma categoria", () => {
    const g = agruparPorCategoriaPessoal([
      gasto("Cartão", 300, true),
      gasto("Cartão", 200, false),
    ]);
    expect(g[0].pago).toBe(300);
    expect(g[0].emAberto).toBe(200);
    expect(g[0].total).toBe(500);
  });
});

describe("fixosVigentes", () => {
  const fixo = (p: Partial<FixoPessoal>): FixoPessoal => ({
    id: "x",
    active: true,
    start_month: "2026-01",
    end_month: null,
    ...p,
  });

  it("ignora o desativado", () => {
    expect(fixosVigentes([fixo({ active: false })], "2026-10")).toHaveLength(0);
  });

  it("ignora o que começa depois do mês", () => {
    expect(
      fixosVigentes([fixo({ start_month: "2026-11" })], "2026-10"),
    ).toHaveLength(0);
  });

  it("inclui o que começa exatamente no mês", () => {
    expect(
      fixosVigentes([fixo({ start_month: "2026-10" })], "2026-10"),
    ).toHaveLength(1);
  });

  it("ignora o que já terminou, mas inclui o último mês dele", () => {
    expect(
      fixosVigentes([fixo({ end_month: "2026-09" })], "2026-10"),
    ).toHaveLength(0);
    expect(
      fixosVigentes([fixo({ end_month: "2026-10" })], "2026-10"),
    ).toHaveLength(1);
  });
});

describe("fixosAGerar", () => {
  const a: FixoPessoal = {
    id: "a",
    active: true,
    start_month: "2026-01",
    end_month: null,
  };
  const b: FixoPessoal = { ...a, id: "b" };

  it("deixa de fora o que já virou lançamento neste mês", () => {
    const falta = fixosAGerar([a, b], [{ recurrence_id: "a" }], "2026-10");
    expect(falta.map((f) => f.id)).toEqual(["b"]);
  });

  it("clicar de novo não gera nada", () => {
    const falta = fixosAGerar(
      [a, b],
      [{ recurrence_id: "a" }, { recurrence_id: "b" }],
      "2026-10",
    );
    expect(falta).toHaveLength(0);
  });

  it("lançamento avulso (sem recorrência) não bloqueia o fixo", () => {
    const falta = fixosAGerar([a], [{ recurrence_id: null }], "2026-10");
    expect(falta.map((f) => f.id)).toEqual(["a"]);
  });
});
