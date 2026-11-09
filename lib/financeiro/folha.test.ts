import { describe, expect, it } from "vitest";
import {
  montarFolha,
  totalDaFolha,
  type LancamentoFolha,
} from "@/lib/financeiro/folha";

function l(
  description: string,
  amount: number,
  extra: Partial<LancamentoFolha> = {},
): LancamentoFolha {
  return {
    id: description,
    description,
    kind: "Despesa",
    amount,
    status: "Pago",
    due_date: "2026-11-10",
    categoria: "Assinaturas e ferramentas digitais",
    cliente: null,
    ...extra,
  };
}

describe("montarFolha", () => {
  it("pega só o lado pedido", () => {
    const entrou = montarFolha(
      [
        l("Kiku Sushi", 2200, { kind: "Receita", categoria: "Mensalidades" }),
        l("Canva", 53),
      ],
      "Receita",
    );

    expect(entrou).toHaveLength(1);
    expect(entrou[0].categoria).toBe("Mensalidades");
  });

  it("agrupa por categoria e soma pago e pendente separados", () => {
    const [grupo] = montarFolha(
      [
        l("Canva", 53),
        l("Adobe", 95, { status: "Pendente" }),
        l("CapCut", 32.9),
      ],
      "Despesa",
    );

    expect(grupo.total).toBeCloseTo(180.9, 2);
    expect(grupo.pago).toBeCloseTo(85.9, 2);
    expect(grupo.pendente).toBe(95);
    expect(grupo.linhas).toHaveLength(3);
  });

  it("põe o que está em aberto primeiro dentro do grupo", () => {
    const [grupo] = montarFolha(
      [
        l("Canva", 53),
        l("Adobe", 95, { status: "Pendente" }),
        l("Claude Max", 454.1),
        l("CapCut", 32.9, { status: "Pendente" }),
      ],
      "Despesa",
    );

    // Em aberto primeiro, porque é o que ainda pede ação. Depois, do
    // maior para o menor.
    expect(grupo.linhas.map((x) => x.description)).toEqual([
      "Adobe",
      "CapCut",
      "Claude Max",
      "Canva",
    ]);
  });

  it("põe o grupo mais caro primeiro", () => {
    const grupos = montarFolha(
      [
        l("Canva", 53),
        l("Pró-labore Fran", 6500, { categoria: "Pró-labore (sócias)" }),
      ],
      "Despesa",
    );

    expect(grupos.map((g) => g.categoria)).toEqual([
      "Pró-labore (sócias)",
      "Assinaturas e ferramentas digitais",
    ]);
  });

  it("junta quem está sem categoria", () => {
    const grupos = montarFolha([l("Algo", 10, { categoria: null })], "Despesa");
    expect(grupos[0].categoria).toBe("Sem categoria");
  });

  it("devolve lista vazia sem lançamento do lado pedido", () => {
    expect(montarFolha([l("Canva", 53)], "Receita")).toEqual([]);
  });
});

describe("totalDaFolha", () => {
  it("soma os grupos", () => {
    const grupos = montarFolha(
      [
        l("Canva", 53),
        l("Pró-labore Fran", 6500, { categoria: "Pró-labore (sócias)" }),
      ],
      "Despesa",
    );
    expect(totalDaFolha(grupos)).toBe(6553);
  });

  it("é zero com a folha vazia", () => {
    expect(totalDaFolha([])).toBe(0);
  });
});
