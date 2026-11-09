import { describe, expect, it } from "vitest";
import {
  montarFolha,
  partirPorSituacao,
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

describe("partirPorSituacao", () => {
  const venceu = (x: { due_date: string | null }) =>
    x.due_date !== null && x.due_date < "2026-11-09";

  it("divide o lado em pago, a vencer e vencido", () => {
    const grupos = montarFolha(
      [
        l("Canva", 53),
        l("Adobe", 95, { status: "Pendente", due_date: "2026-11-05" }),
        l("Claude Max", 454.1, { status: "Pendente", due_date: "2026-11-20" }),
      ],
      "Despesa",
    );
    const partes = partirPorSituacao(grupos, venceu);

    expect(partes.pago).toBe(53);
    expect(partes.vencido).toBe(95);
    expect(partes.aVencer).toBeCloseTo(454.1, 2);
    expect(partes.total).toBeCloseTo(602.1, 2);
  });

  it("as três partes somam o total", () => {
    const grupos = montarFolha(
      [
        l("A", 10),
        l("B", 20, { status: "Pendente", due_date: "2026-11-01" }),
        l("C", 30, { status: "Pendente", due_date: "2026-12-01" }),
        l("D", 40, { status: "Pendente", due_date: null }),
      ],
      "Despesa",
    );
    const p = partirPorSituacao(grupos, venceu);
    expect(p.pago + p.aVencer + p.vencido).toBeCloseTo(p.total, 2);
  });

  it("sem lançamento nenhum é tudo zero", () => {
    expect(partirPorSituacao([], venceu)).toEqual({
      pago: 0,
      aVencer: 0,
      vencido: 0,
      total: 0,
    });
  });
});
