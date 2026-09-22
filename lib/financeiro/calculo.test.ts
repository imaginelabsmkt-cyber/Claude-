import { describe, it, expect } from "vitest";
import {
  agruparPorCategoria,
  agruparPorCliente,
  arredondar,
  dividirSeguro,
  encadearMeses,
  resumirMes,
  somar,
  variacao,
} from "@/lib/financeiro/calculo";
import {
  dataVencimento,
  deslocarMes,
  intervaloMeses,
  mesValido,
  montarMes,
  rotuloMes,
  rotuloMesCurto,
} from "@/lib/financeiro/meses";
import type { FinancialEntry } from "@/types";

/** Cria um lançamento completo, permitindo sobrescrever campos. */
function lancamento(over: Partial<FinancialEntry> = {}): FinancialEntry {
  return {
    id: "e1",
    reference_month: "2026-04",
    kind: "Receita",
    category_id: "cat-mensalidade",
    client_id: null,
    description: "Lançamento teste",
    amount: 100,
    status: "Pago",
    due_date: null,
    paid_date: null,
    payment_method: null,
    notes: null,
    recurrence_id: null,
    team_member_id: null,
    created_at: "2026-04-01T12:00:00Z",
    updated_at: "2026-04-01T12:00:00Z",
    ...over,
  };
}

describe("meses", () => {
  it("valida o formato YYYY-MM", () => {
    expect(mesValido("2026-04")).toBe(true);
    expect(mesValido("2026-13")).toBe(false);
    expect(mesValido("2026-4")).toBe(false);
    expect(mesValido("abril")).toBe(false);
  });

  it("desloca meses atravessando a virada do ano", () => {
    expect(deslocarMes("2026-12", 1)).toBe("2027-01");
    expect(deslocarMes("2026-01", -1)).toBe("2025-12");
    expect(deslocarMes("2026-04", 9)).toBe("2027-01");
  });

  it("normaliza mês fora do intervalo ao montar", () => {
    expect(montarMes(2026, 13)).toBe("2027-01");
    expect(montarMes(2026, 0)).toBe("2025-12");
  });

  it("gera o intervalo de meses da planilha (Abril a Dezembro)", () => {
    const meses = intervaloMeses("2026-04", "2026-12");
    expect(meses).toHaveLength(9);
    expect(meses[0]).toBe("2026-04");
    expect(meses[8]).toBe("2026-12");
  });

  it("devolve intervalo vazio quando invertido ou inválido", () => {
    expect(intervaloMeses("2026-12", "2026-04")).toEqual([]);
    expect(intervaloMeses("2026-99", "2026-12")).toEqual([]);
  });

  it("formata rótulos em pt-BR", () => {
    expect(rotuloMesCurto("2026-04")).toBe("Abr/26");
    expect(rotuloMes("2026-12")).toBe("Dezembro/2026");
  });

  it("ajusta o vencimento para o último dia quando o dia não existe", () => {
    expect(dataVencimento("2026-04", 10)).toBe("2026-04-10");
    expect(dataVencimento("2026-04", 31)).toBe("2026-04-30");
    expect(dataVencimento("2026-02", 30)).toBe("2026-02-28");
    expect(dataVencimento("2026-04", null)).toBeNull();
  });
});

describe("arredondamento", () => {
  it("mantém a soma em centavos exatos", () => {
    expect(somar([0.1, 0.2])).toBe(0.3);
    expect(arredondar(159.905)).toBe(159.91);
    expect(somar([304.76, 159.9, 86.05])).toBe(550.71);
  });

  it("protege a divisão por zero (equivalente ao IFERROR)", () => {
    expect(dividirSeguro(100, 0)).toBe(0);
    expect(dividirSeguro(50, 200)).toBe(0.25);
  });
});

describe("resumirMes", () => {
  it("separa realizado de pendente e calcula o saldo final", () => {
    const lancamentos = [
      lancamento({ id: "1", amount: 2000, status: "Pago" }),
      lancamento({ id: "2", amount: 1550, status: "Pendente" }),
      lancamento({
        id: "3",
        kind: "Despesa",
        category_id: "cat-prolabore",
        amount: 6500,
        status: "Pago",
      }),
      lancamento({
        id: "4",
        kind: "Despesa",
        category_id: "cat-prolabore",
        amount: 500,
        status: "Pendente",
      }),
    ];

    const r = resumirMes("2026-04", lancamentos, 1000);

    expect(r.receitas).toBe(2000);
    expect(r.despesas).toBe(6500);
    expect(r.aReceber).toBe(1550);
    expect(r.aPagar).toBe(500);
    expect(r.resultado).toBe(-4500);
    expect(r.saldoFinal).toBe(-3500);
    expect(r.receitasPrevistas).toBe(3550);
    expect(r.despesasPrevistas).toBe(7000);
    expect(r.resultadoPrevisto).toBe(-3450);
    expect(r.saldoFinalPrevisto).toBe(-2450);
    expect(r.quantidade).toBe(4);
  });

  it("ignora lançamentos de outros meses", () => {
    const lancamentos = [
      lancamento({ id: "1", reference_month: "2026-04", amount: 500 }),
      lancamento({ id: "2", reference_month: "2026-05", amount: 900 }),
    ];
    expect(resumirMes("2026-04", lancamentos, 0).receitas).toBe(500);
    expect(resumirMes("2026-05", lancamentos, 0).receitas).toBe(900);
  });

  it("zera a margem quando não há receita (sem divisão por zero)", () => {
    const r = resumirMes("2026-04", [lancamento({ kind: "Despesa", amount: 300 })], 0);
    expect(r.margem).toBe(0);
    expect(r.resultado).toBe(-300);
  });

  it("calcula a margem líquida como resultado/receita", () => {
    const r = resumirMes(
      "2026-04",
      [
        lancamento({ id: "1", amount: 10000 }),
        lancamento({ id: "2", kind: "Despesa", amount: 7500 }),
      ],
      0,
    );
    expect(r.receitas).toBe(10000);
    expect(r.margem).toBeCloseTo(0.25, 10);
  });
});

describe("encadearMeses", () => {
  it("usa o saldo final de um mês como saldo inicial do seguinte", () => {
    const lancamentos = [
      lancamento({ id: "1", reference_month: "2026-04", amount: 5000 }),
      lancamento({
        id: "2",
        reference_month: "2026-04",
        kind: "Despesa",
        amount: 3000,
      }),
      lancamento({ id: "3", reference_month: "2026-05", amount: 4000 }),
      lancamento({
        id: "4",
        reference_month: "2026-05",
        kind: "Despesa",
        amount: 1000,
      }),
    ];

    const serie = encadearMeses(["2026-04", "2026-05", "2026-06"], lancamentos, 500);

    expect(serie[0].saldoInicial).toBe(500);
    expect(serie[0].saldoFinal).toBe(2500); // 500 + (5000 - 3000)
    expect(serie[1].saldoInicial).toBe(2500);
    expect(serie[1].saldoFinal).toBe(5500); // 2500 + (4000 - 1000)
    // Mês sem lançamento não perde o saldo acumulado.
    expect(serie[2].saldoInicial).toBe(5500);
    expect(serie[2].saldoFinal).toBe(5500);
    expect(serie[2].resultado).toBe(0);
  });

  it("pendências não movimentam o saldo acumulado", () => {
    const serie = encadearMeses(
      ["2026-04", "2026-05"],
      [
        lancamento({ id: "1", reference_month: "2026-04", amount: 1000, status: "Pendente" }),
        lancamento({ id: "2", reference_month: "2026-05", amount: 2000, status: "Pago" }),
      ],
      0,
    );
    expect(serie[0].saldoFinal).toBe(0);
    expect(serie[0].aReceber).toBe(1000);
    expect(serie[1].saldoInicial).toBe(0);
    expect(serie[1].saldoFinal).toBe(2000);
  });
});

describe("agrupamentos", () => {
  const meta = new Map([
    ["cat-mensalidade", { nome: "Mensalidades", kind: "Receita" as const, ordem: 10 }],
    ["cat-avulso", { nome: "Projetos avulsos", kind: "Receita" as const, ordem: 20 }],
  ]);

  it("soma realizado e pendente por categoria, na ordem configurada", () => {
    const grupos = agruparPorCategoria(
      [
        lancamento({ id: "1", category_id: "cat-avulso", amount: 1000, status: "Pago" }),
        lancamento({ id: "2", category_id: "cat-mensalidade", amount: 2000, status: "Pago" }),
        lancamento({
          id: "3",
          category_id: "cat-mensalidade",
          amount: 1550,
          status: "Pendente",
        }),
      ],
      meta,
    );

    expect(grupos.map((g) => g.nome)).toEqual(["Mensalidades", "Projetos avulsos"]);
    expect(grupos[0].realizado).toBe(2000);
    expect(grupos[0].pendente).toBe(1550);
    expect(grupos[0].previsto).toBe(3550);
    expect(grupos[0].quantidade).toBe(2);
  });

  it("classifica categoria desconhecida como 'Sem categoria'", () => {
    const grupos = agruparPorCategoria([lancamento({ category_id: "sumiu" })], meta);
    expect(grupos[0].nome).toBe("Sem categoria");
  });

  it("ranqueia clientes por faturamento e ignora despesas", () => {
    const nomes = new Map([
      ["cli-1", "Kiku Sushi"],
      ["cli-2", "Osteo&Fit"],
    ]);
    const ranking = agruparPorCliente(
      [
        lancamento({ id: "1", client_id: "cli-1", amount: 2200, status: "Pago" }),
        lancamento({ id: "2", client_id: "cli-2", amount: 2000, status: "Pago" }),
        lancamento({ id: "3", client_id: "cli-2", amount: 500, status: "Pendente" }),
        lancamento({ id: "4", client_id: null, amount: 300, status: "Pago" }),
        lancamento({ id: "5", client_id: "cli-1", kind: "Despesa", amount: 9000 }),
      ],
      nomes,
    );

    expect(ranking.map((c) => c.nome)).toEqual(["Osteo&Fit", "Kiku Sushi", "Sem cliente"]);
    expect(ranking[0].total).toBe(2500);
    expect(ranking[0].pendente).toBe(500);
    expect(ranking[1].total).toBe(2200);
  });
});

describe("variacao", () => {
  it("compara com o mês anterior", () => {
    expect(variacao(1200, 1000)).toBeCloseTo(0.2, 10);
    expect(variacao(800, 1000)).toBeCloseTo(-0.2, 10);
  });

  it("devolve null quando não há base de comparação", () => {
    expect(variacao(1000, 0)).toBeNull();
  });
});
