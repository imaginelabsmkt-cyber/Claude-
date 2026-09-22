import { describe, it, expect } from "vitest";
import {
  calcularRentabilidade,
  receitaSemCliente,
} from "@/lib/financeiro/rentabilidade";
import type { FinancialEntry } from "@/types";

function l(over: Partial<FinancialEntry> = {}): FinancialEntry {
  return {
    id: Math.random().toString(36).slice(2),
    reference_month: "2026-09",
    kind: "Receita",
    category_id: "cat",
    client_id: null,
    description: "lançamento",
    amount: 100,
    status: "Pago",
    due_date: null,
    paid_date: null,
    payment_method: null,
    notes: null,
    recurrence_id: null,
    team_member_id: null,
    created_at: "2026-09-01T12:00:00Z",
    updated_at: "2026-09-01T12:00:00Z",
    ...over,
  };
}

const NOMES = new Map([
  ["a", "Kiku Sushi"],
  ["b", "Laura Chioquetta"],
]);

describe("calcularRentabilidade", () => {
  it("separa custo direto de custo indireto", () => {
    const r = calcularRentabilidade(
      [
        l({ client_id: "a", amount: 2200 }),
        l({ client_id: "b", amount: 1550 }),
        // Direto: freela que editou para o Kiku.
        l({ kind: "Despesa", client_id: "a", amount: 400 }),
        // Indireto: pró-labore não é de ninguém.
        l({ kind: "Despesa", amount: 1000 }),
      ],
      NOMES,
    );

    expect(r.receitaTotal).toBe(3750);
    expect(r.custoDiretoTotal).toBe(400);
    expect(r.custoIndireto).toBe(1000);
    expect(r.resultado).toBe(2350);
  });

  it("rateia o indireto na proporção da receita", () => {
    const r = calcularRentabilidade(
      [
        l({ client_id: "a", amount: 3000 }), // 75% da receita
        l({ client_id: "b", amount: 1000 }), // 25%
        l({ kind: "Despesa", amount: 800 }), // indireto
      ],
      NOMES,
    );

    const kiku = r.clientes.find((c) => c.clienteId === "a")!;
    const laura = r.clientes.find((c) => c.clienteId === "b")!;

    expect(kiku.pesoNaReceita).toBeCloseTo(0.75, 10);
    expect(kiku.rateio).toBe(600); // 75% de 800
    expect(laura.rateio).toBe(200);
    // O rateio distribui o indireto inteiro, sem sobra.
    expect(kiku.rateio + laura.rateio).toBe(800);
  });

  it("acusa cliente que não cobre o próprio peso", () => {
    const r = calcularRentabilidade(
      [
        l({ client_id: "a", amount: 2000 }),
        l({ client_id: "b", amount: 1000 }),
        // O cliente b dá muito trabalho: custo direto alto.
        l({ kind: "Despesa", client_id: "b", amount: 900 }),
        l({ kind: "Despesa", amount: 600 }),
      ],
      NOMES,
    );

    const laura = r.clientes.find((c) => c.clienteId === "b")!;
    expect(laura.margemDireta).toBe(100);
    expect(laura.rateio).toBe(200); // 1/3 de 600
    expect(laura.resultadoComRateio).toBe(-100);

    // A ordenação põe quem mais rende primeiro.
    expect(r.clientes[0].clienteId).toBe("a");
    expect(r.clientes[r.clientes.length - 1].clienteId).toBe("b");
  });

  it("ignora o que ainda não foi pago", () => {
    const r = calcularRentabilidade(
      [
        l({ client_id: "a", amount: 2000, status: "Pago" }),
        l({ client_id: "a", amount: 9999, status: "Pendente" }),
        l({ kind: "Despesa", client_id: "a", amount: 8888, status: "Pendente" }),
      ],
      NOMES,
    );

    expect(r.receitaTotal).toBe(2000);
    expect(r.custoDiretoTotal).toBe(0);
  });

  it("cliente que só teve custo aparece com receita zero", () => {
    const r = calcularRentabilidade(
      [
        l({ client_id: "a", amount: 1000 }),
        l({ kind: "Despesa", client_id: "b", amount: 300 }),
      ],
      NOMES,
    );

    const laura = r.clientes.find((c) => c.clienteId === "b")!;
    expect(laura.receita).toBe(0);
    expect(laura.margemDireta).toBe(-300);
    expect(laura.margemPercentual).toBe(0); // sem divisão por zero
    expect(laura.rateio).toBe(0); // peso zero na receita
  });

  it("sem receita nenhuma não quebra", () => {
    const r = calcularRentabilidade([l({ kind: "Despesa", amount: 500 })], NOMES);
    expect(r.receitaTotal).toBe(0);
    expect(r.custoIndireto).toBe(500);
    expect(r.resultado).toBe(-500);
    expect(r.clientes).toEqual([]);
  });

  it("nomeia cliente que foi apagado", () => {
    const r = calcularRentabilidade([l({ client_id: "sumiu", amount: 100 })], NOMES);
    expect(r.clientes[0].nome).toBe("Cliente removido");
  });
});

describe("receitaSemCliente", () => {
  it("soma só receita paga e sem cliente", () => {
    const total = receitaSemCliente([
      l({ amount: 300 }),
      l({ amount: 500, status: "Pendente" }),
      l({ client_id: "a", amount: 900 }),
      l({ kind: "Despesa", amount: 700 }),
    ]);
    expect(total).toBe(300);
  });
});
