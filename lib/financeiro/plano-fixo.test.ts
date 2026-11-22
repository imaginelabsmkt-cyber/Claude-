import { describe, expect, it } from "vitest";
import {
  avisoDoItem,
  conferirPlano,
  quantosMarcados,
  type ItemDoPlano,
  type JaNoMes,
} from "@/lib/financeiro/plano-fixo";

const FERRAMENTAS = "cat-ferramentas";
const PROLABORE = "cat-prolabore";

function item(over: Partial<ItemDoPlano> = {}): ItemDoPlano {
  return {
    id: "r1",
    description: "Claude Max",
    categoryId: FERRAMENTAS,
    kind: "Despesa",
    amount: 454.1,
    ...over,
  };
}

function noMes(over: Partial<JaNoMes> = {}): JaNoMes {
  return {
    description: "Claude Max",
    categoryId: FERRAMENTAS,
    kind: "Despesa",
    amount: 454.1,
    recurrenceId: null,
    ...over,
  };
}

describe("conferir o plano fixo", () => {
  it("mês vazio: tudo vem marcado", () => {
    const r = conferirPlano([item(), item({ id: "r2", description: "Canva", amount: 35 })], []);
    expect(r.every((x) => x.marcado)).toBe(true);
    expect(r.every((x) => x.jaLancado === null)).toBe(true);
    expect(quantosMarcados(r)).toBe(2);
  });

  it("a recorrência que já gerou vem desmarcada", () => {
    const r = conferirPlano([item()], [noMes({ recurrenceId: "r1", description: "outro nome" })]);
    expect(r[0].marcado).toBe(false);
    expect(r[0].jaLancado).toBe("gerado");
  });

  it("mesma descrição conta, mesmo lançada à mão", () => {
    const r = conferirPlano([item()], [noMes({ recurrenceId: null, amount: 999 })]);
    expect(r[0].jaLancado).toBe("mesma descrição");
  });

  it("descrição compara sem acento, sem caixa e sem espaço sobrando", () => {
    const r = conferirPlano(
      [item({ description: "Pró-labore Vitória" })],
      [noMes({ description: "  pro-labore  vitoria " })],
    );
    expect(r[0].jaLancado).toBe("mesma descrição");
  });

  it("mesma categoria com o mesmo valor conta, com outro nome", () => {
    // "Claude" lançado à mão no lugar de "Claude Max".
    const r = conferirPlano([item()], [noMes({ description: "Claude" })]);
    expect(r[0].jaLancado).toBe("mesma categoria e valor");
  });

  it("mesma categoria com valor diferente NÃO conta", () => {
    const r = conferirPlano([item()], [noMes({ description: "Canva", amount: 35 })]);
    expect(r[0].marcado).toBe(true);
  });

  it("mesmo valor em categoria diferente NÃO conta", () => {
    const r = conferirPlano(
      [item()],
      [noMes({ description: "outra coisa", categoryId: PROLABORE })],
    );
    expect(r[0].marcado).toBe(true);
  });

  it("receita não bate com despesa de mesmo nome e valor", () => {
    const r = conferirPlano([item()], [noMes({ kind: "Receita" })]);
    expect(r[0].marcado).toBe(true);
  });

  it("item sem categoria não casa por categoria", () => {
    const r = conferirPlano(
      [item({ categoryId: null, description: "Avulso" })],
      [noMes({ description: "outro", categoryId: null })],
    );
    expect(r[0].marcado).toBe(true);
  });

  it("centavos: 454,10 é 454,10 e não 454,11", () => {
    expect(conferirPlano([item()], [noMes({ description: "x" })])[0].marcado).toBe(false);
    expect(
      conferirPlano([item()], [noMes({ description: "x", amount: 454.11 })])[0].marcado,
    ).toBe(true);
  });

  it("o desmarcado continua na lista", () => {
    // Sumir seria decidir pela pessoa. Ela vê, entende e marca se quiser.
    const r = conferirPlano([item(), item({ id: "r2", description: "Canva", amount: 35 })], [
      noMes({ recurrenceId: "r1" }),
    ]);
    expect(r).toHaveLength(2);
    expect(quantosMarcados(r)).toBe(1);
  });
});

describe("aviso escrito", () => {
  it("diz por que está desmarcado", () => {
    expect(avisoDoItem("gerado")).toBe("já lançado");
    expect(avisoDoItem("mesma descrição")).toBe("já lançado · mesma descrição");
    expect(avisoDoItem("mesma categoria e valor")).toBe(
      "já lançado · mesma categoria e valor",
    );
  });
});
