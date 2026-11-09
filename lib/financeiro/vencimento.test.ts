import { describe, expect, it } from "vitest";
import {
  contarUrgentes,
  diasAte,
  ordenarPorUrgencia,
  situacaoDoLancamento,
  textoDoPrazo,
} from "@/lib/financeiro/vencimento";

const HOJE = "2026-11-09";

const l = (status: string, due_date: string | null) => ({ status, due_date });

describe("diasAte", () => {
  it("conta os dias para frente e para trás", () => {
    expect(diasAte("2026-11-10", HOJE)).toBe(1);
    expect(diasAte("2026-11-09", HOJE)).toBe(0);
    expect(diasAte("2026-11-05", HOJE)).toBe(-4);
  });

  it("atravessa o fim do mês e do ano", () => {
    expect(diasAte("2026-12-01", "2026-11-30")).toBe(1);
    expect(diasAte("2027-01-01", "2026-12-31")).toBe(1);
  });

  it("não escorrega um dia no fuso de Boa Vista", () => {
    // new Date("2026-11-09") é meia-noite UTC, que em Boa Vista (UTC-4)
    // ainda é dia 8. Por isso a conta é feita com Date.UTC dos dois.
    expect(diasAte("2026-11-09", "2026-11-09")).toBe(0);
  });
});

describe("situacaoDoLancamento", () => {
  it("pago é pago, mesmo com vencimento no passado", () => {
    expect(situacaoDoLancamento(l("Pago", "2026-10-01"), HOJE)).toBe("Pago");
  });

  it("vencido, vence hoje e a vencer", () => {
    expect(situacaoDoLancamento(l("Pendente", "2026-11-05"), HOJE)).toBe("Vencido");
    expect(situacaoDoLancamento(l("Pendente", "2026-11-09"), HOJE)).toBe("Vence hoje");
    expect(situacaoDoLancamento(l("Pendente", "2026-11-20"), HOJE)).toBe("A vencer");
  });

  it("sem data não é vencido", () => {
    expect(situacaoDoLancamento(l("Pendente", null), HOJE)).toBe("Sem data");
  });
});

describe("textoDoPrazo", () => {
  it("fala em dias, não em data", () => {
    expect(textoDoPrazo(l("Pendente", "2026-11-08"), HOJE)).toBe("venceu ontem");
    expect(textoDoPrazo(l("Pendente", "2026-11-04"), HOJE)).toBe("venceu há 5 dias");
    expect(textoDoPrazo(l("Pendente", "2026-11-09"), HOJE)).toBe("vence hoje");
    expect(textoDoPrazo(l("Pendente", "2026-11-10"), HOJE)).toBe("vence amanhã");
    expect(textoDoPrazo(l("Pendente", "2026-11-19"), HOJE)).toBe("vence em 10 dias");
  });

  it("diz pago e sem data", () => {
    expect(textoDoPrazo(l("Pago", "2026-11-01"), HOJE)).toBe("pago");
    expect(textoDoPrazo(l("Pendente", null), HOJE)).toBe("sem data");
  });
});

describe("ordenarPorUrgencia", () => {
  it("põe o que pede ação antes do que já foi resolvido", () => {
    const lista = [
      { id: "pago", ...l("Pago", "2026-11-08") },
      { id: "a-vencer", ...l("Pendente", "2026-11-20") },
      { id: "vencido", ...l("Pendente", "2026-11-01") },
      { id: "hoje", ...l("Pendente", "2026-11-09") },
      { id: "sem-data", ...l("Pendente", null) },
    ];

    expect(ordenarPorUrgencia(lista, HOJE).map((x) => x.id)).toEqual([
      "vencido",
      "hoje",
      "a-vencer",
      "sem-data",
      "pago",
    ]);
  });

  it("entre vencidos, o mais antigo primeiro", () => {
    const lista = [
      { id: "b", ...l("Pendente", "2026-11-05") },
      { id: "a", ...l("Pendente", "2026-11-01") },
    ];
    expect(ordenarPorUrgencia(lista, HOJE).map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("entre pagos, o mais recente primeiro", () => {
    const lista = [
      { id: "antigo", ...l("Pago", "2026-11-01") },
      { id: "recente", ...l("Pago", "2026-11-08") },
    ];
    expect(ordenarPorUrgencia(lista, HOJE).map((x) => x.id)).toEqual([
      "recente",
      "antigo",
    ]);
  });

  it("não altera a lista recebida", () => {
    const lista = [
      { id: "pago", ...l("Pago", "2026-11-08") },
      { id: "vencido", ...l("Pendente", "2026-11-01") },
    ];
    ordenarPorUrgencia(lista, HOJE);
    expect(lista[0].id).toBe("pago");
  });
});

describe("contarUrgentes", () => {
  it("conta vencido e vence hoje, e só isso", () => {
    const lista = [
      l("Pendente", "2026-11-01"),
      l("Pendente", "2026-11-09"),
      l("Pendente", "2026-11-20"),
      l("Pago", "2026-11-01"),
      l("Pendente", null),
    ];
    expect(contarUrgentes(lista, HOJE)).toBe(2);
  });

  it("é zero com a lista vazia", () => {
    expect(contarUrgentes([], HOJE)).toBe(0);
  });
});

describe("o vencimento no mês seguinte", () => {
  it("não marca como vencido o que vence no mês que vem", () => {
    // A mensalidade de outubro vence em 10 de novembro. Em 9 de
    // novembro ela ainda não venceu. Antes o sistema punha o
    // vencimento em 10 de OUTUBRO e dizia "venceu há 30 dias".
    expect(
      situacaoDoLancamento({ status: "Pendente", due_date: "2026-11-10" }, "2026-11-09"),
    ).toBe("A vencer");
  });

  it("marca como vencido quando o dia do mês seguinte passou", () => {
    expect(
      situacaoDoLancamento({ status: "Pendente", due_date: "2026-11-05" }, "2026-11-09"),
    ).toBe("Vencido");
  });
});
