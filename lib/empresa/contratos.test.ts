import { describe, expect, it } from "vitest";
import {
  contratosQuePedemConversa,
  diasAteOFim,
  diasEntre,
  mesesDeCasa,
  proximoReajuste,
  receitaContratada,
  reajusteVencido,
  situacaoDoContrato,
  somarUmAno,
  type ContratoBase,
} from "./contratos";

const HOJE = "2026-11-09";

function contrato(over: Partial<ContratoBase> = {}): ContratoBase {
  return {
    status: "Ativo",
    start_date: "2026-01-01",
    end_date: null,
    readjust_index: null,
    last_readjust: null,
    monthly_amount: 2000,
    ...over,
  };
}

describe("datas", () => {
  it("conta os dias sem escorregar de fuso", () => {
    // new Date("2026-11-10") é UTC; em Boa Vista (-4) viraria dia 9.
    expect(diasEntre("2026-11-09", "2026-11-10")).toBe(1);
    expect(diasEntre("2026-11-09", "2026-11-09")).toBe(0);
    expect(diasEntre("2026-11-09", "2026-11-08")).toBe(-1);
  });

  it("atravessa a virada do ano", () => {
    expect(diasEntre("2026-12-31", "2027-01-01")).toBe(1);
  });

  it("soma um ano, e 29/02 cai em 28/02", () => {
    expect(somarUmAno("2026-03-15")).toBe("2027-03-15");
    expect(somarUmAno("2028-02-29")).toBe("2029-02-28");
  });
});

describe("situacaoDoContrato", () => {
  it("sem data de fim, está vigente e não vence nunca", () => {
    const c = contrato();
    expect(situacaoDoContrato(c, HOJE)).toBe("Vigente");
    expect(diasAteOFim(c, HOJE)).toBeNull();
  });

  it("avisa 45 dias antes, não antes disso", () => {
    expect(situacaoDoContrato(contrato({ end_date: "2026-12-24" }), HOJE)).toBe(
      "Vence em breve",
    );
    expect(situacaoDoContrato(contrato({ end_date: "2026-12-25" }), HOJE)).toBe(
      "Vigente",
    );
  });

  it("vencido é vencido, mesmo por um dia", () => {
    expect(situacaoDoContrato(contrato({ end_date: "2026-11-08" }), HOJE)).toBe(
      "Vencido",
    );
    expect(situacaoDoContrato(contrato({ end_date: "2026-11-09" }), HOJE)).toBe(
      "Vence em breve",
    );
  });

  it("pausado e encerrado não viram vencido", () => {
    const vencido = { end_date: "2020-01-01" } as const;
    expect(
      situacaoDoContrato(contrato({ ...vencido, status: "Pausado" }), HOJE),
    ).toBe("Pausado");
    expect(
      situacaoDoContrato(contrato({ ...vencido, status: "Encerrado" }), HOJE),
    ).toBe("Encerrado");
  });
});

describe("reajuste", () => {
  it("sem índice combinado, não existe reajuste a cobrar", () => {
    const c = contrato({ readjust_index: null, start_date: "2020-01-01" });
    expect(proximoReajuste(c)).toBeNull();
    expect(reajusteVencido(c, HOJE)).toBe(false);
  });

  it("conta um ano do início quando nunca houve reajuste", () => {
    const c = contrato({ readjust_index: "IPCA", start_date: "2026-03-01" });
    expect(proximoReajuste(c)).toBe("2027-03-01");
    expect(reajusteVencido(c, HOJE)).toBe(false);
  });

  it("conta do último reajuste quando já houve", () => {
    const c = contrato({
      readjust_index: "IPCA",
      start_date: "2020-01-01",
      last_readjust: "2026-02-01",
    });
    expect(proximoReajuste(c)).toBe("2027-02-01");
    expect(reajusteVencido(c, HOJE)).toBe(false);
  });

  it("acusa quando passou da hora", () => {
    const c = contrato({
      readjust_index: "IGP-M",
      start_date: "2024-01-01",
      last_readjust: "2025-01-01",
    });
    expect(reajusteVencido(c, HOJE)).toBe(true);
  });

  it("contrato pausado não cobra reajuste", () => {
    const c = contrato({
      status: "Pausado",
      readjust_index: "IPCA",
      start_date: "2020-01-01",
    });
    expect(reajusteVencido(c, HOJE)).toBe(false);
  });
});

describe("contratosQuePedemConversa", () => {
  it("põe o vencido antes do que vai vencer, e o reajuste por último", () => {
    const vencido = contrato({ end_date: "2026-10-01" });
    const vencendo = contrato({ end_date: "2026-11-30" });
    const reajuste = contrato({
      readjust_index: "IPCA",
      start_date: "2024-01-01",
    });
    const tranquilo = contrato({ end_date: "2027-12-31" });

    const fila = contratosQuePedemConversa(
      [tranquilo, reajuste, vencendo, vencido],
      HOJE,
    );
    expect(fila.map((f) => f.motivo)).toEqual([
      "Vencido",
      "Vence em breve",
      "Reajuste",
    ]);
  });

  it("quem vai renovar não aparece também por reajuste", () => {
    // Na conversa de renovação o valor já é negociado; cobrar as duas
    // coisas faria a mesma ligação aparecer duas vezes na lista.
    const c = contrato({
      end_date: "2026-11-30",
      readjust_index: "IPCA",
      start_date: "2024-01-01",
    });
    const fila = contratosQuePedemConversa([c], HOJE);
    expect(fila).toHaveLength(1);
    expect(fila[0].motivo).toBe("Vence em breve");
  });

  it("encerrado não pede conversa nenhuma", () => {
    const c = contrato({ status: "Encerrado", end_date: "2026-01-01" });
    expect(contratosQuePedemConversa([c], HOJE)).toHaveLength(0);
  });

  it("lista vazia não quebra", () => {
    expect(contratosQuePedemConversa([], HOJE)).toEqual([]);
  });
});

describe("mesesDeCasa", () => {
  it("conta mês fechado, não mês começado", () => {
    expect(mesesDeCasa(contrato({ start_date: "2026-01-09" }), HOJE)).toBe(10);
    expect(mesesDeCasa(contrato({ start_date: "2026-01-10" }), HOJE)).toBe(9);
  });

  it("cliente que começou hoje tem zero, não negativo", () => {
    expect(mesesDeCasa(contrato({ start_date: HOJE }), HOJE)).toBe(0);
    expect(mesesDeCasa(contrato({ start_date: "2026-12-01" }), HOJE)).toBe(0);
  });
});

describe("receitaContratada", () => {
  it("soma só os ativos", () => {
    expect(
      receitaContratada([
        contrato({ monthly_amount: 2200 }),
        contrato({ monthly_amount: 1700 }),
        contrato({ monthly_amount: 9999, status: "Encerrado" }),
        contrato({ monthly_amount: 5555, status: "Pausado" }),
      ]),
    ).toBe(3900);
  });

  it("não acumula erro de centavo", () => {
    expect(
      receitaContratada([
        contrato({ monthly_amount: 0.1 }),
        contrato({ monthly_amount: 0.2 }),
      ]),
    ).toBe(0.3);
  });
});
