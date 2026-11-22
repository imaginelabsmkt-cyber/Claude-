import { describe, expect, it } from "vitest";
import {
  caixasDoDia,
  diasEntre,
  paraRetomar,
  pedemAcao,
  quandoFalar,
  somarDias,
  type ParaHoje,
  type ParaRetomar,
} from "@/lib/comercial/hoje";

const HOJE = "2026-11-22";

function l(over: Partial<ParaHoje> = {}): ParaHoje {
  return {
    id: "l1",
    name: "Studio Ravel",
    stage: "Negociação",
    next_contact_on: HOJE,
    estimated_monthly: 1900,
    ...over,
  };
}

describe("contas de data, sem fuso", () => {
  it("soma dias atravessando o mês e o ano", () => {
    expect(somarDias("2026-11-22", 7)).toBe("2026-11-29");
    expect(somarDias("2026-11-28", 7)).toBe("2026-12-05");
    expect(somarDias("2026-12-28", 7)).toBe("2027-01-04");
    expect(somarDias("2028-02-28", 1)).toBe("2028-02-29"); // bissexto
  });

  it("conta dias nos dois sentidos", () => {
    expect(diasEntre(HOJE, "2026-11-25")).toBe(3);
    expect(diasEntre(HOJE, HOJE)).toBe(0);
    expect(diasEntre(HOJE, "2026-11-19")).toBe(-3);
  });
});

describe("as três caixas", () => {
  const base = [
    l({ id: "atrasado", next_contact_on: "2026-11-19" }),
    l({ id: "muito-atrasado", next_contact_on: "2026-10-01" }),
    l({ id: "hoje", next_contact_on: HOJE }),
    l({ id: "semana", next_contact_on: "2026-11-27" }),
    l({ id: "limite", next_contact_on: "2026-11-29" }),
    l({ id: "depois", next_contact_on: "2026-11-30" }),
  ];

  it("separa atrasado, hoje e os próximos 7 dias", () => {
    const c = caixasDoDia(base, HOJE);
    expect(c.atrasados.map((x) => x.id)).toEqual(["muito-atrasado", "atrasado"]);
    expect(c.hoje.map((x) => x.id)).toEqual(["hoje"]);
    expect(c.semana.map((x) => x.id)).toEqual(["semana", "limite"]);
  });

  it("o sétimo dia entra e o oitavo não", () => {
    const c = caixasDoDia(base, HOJE);
    expect(c.semana.map((x) => x.id)).toContain("limite");
    expect(c.semana.map((x) => x.id)).not.toContain("depois");
  });

  it("o mais atrasado vem primeiro", () => {
    const c = caixasDoDia(base, HOJE);
    expect(c.atrasados[0].id).toBe("muito-atrasado");
  });

  it("quem já fechou ou não fechou não entra", () => {
    const c = caixasDoDia(
      [
        l({ id: "fechado", stage: "Fechado", next_contact_on: "2026-01-01" }),
        l({ id: "nao-fechou", stage: "Perdido", next_contact_on: "2026-01-01" }),
      ],
      HOJE,
    );
    expect(c.atrasados).toEqual([]);
  });

  it("em aberto sem data não é atraso", () => {
    // É cadastro incompleto, e isso se resolve na ficha — não aqui,
    // gritando em vermelho.
    const c = caixasDoDia([l({ next_contact_on: null })], HOJE);
    expect(c.atrasados).toEqual([]);
    expect(c.hoje).toEqual([]);
    expect(c.semana).toEqual([]);
  });

  it("data estragada não vira 2000-01-01", () => {
    const c = caixasDoDia([l({ next_contact_on: "ontem" })], HOJE);
    expect(pedemAcao(c)).toBe(0);
  });

  it("pedem ação é atrasado + hoje, sem a semana", () => {
    expect(pedemAcao(caixasDoDia(base, HOJE))).toBe(3);
  });
});

describe("quandoFalar", () => {
  it("fala como gente", () => {
    expect(quandoFalar(HOJE, HOJE)).toBe("hoje");
    expect(quandoFalar("2026-11-23", HOJE)).toBe("amanhã");
    expect(quandoFalar("2026-11-27", HOJE)).toBe("em 5 dias");
    expect(quandoFalar("2026-11-21", HOJE)).toBe("atrasado 1 dia");
    expect(quandoFalar("2026-11-19", HOJE)).toBe("atrasado 3 dias");
  });
});

describe("retomar depois de 90 dias", () => {
  function e(over: Partial<ParaRetomar> = {}): ParaRetomar {
    return {
      id: "e1",
      name: "Clínica Ventre",
      stage: "Perdido",
      encerrada_em: "2026-08-01T12:00:00Z",
      lost_reason_kind: "Não é o momento",
      lost_reason: null,
      ...over,
    };
  }

  it("volta NO dia 90, não no 89", () => {
    // 01/08 -> 22/11 são 113 dias: já passou da hora.
    expect(paraRetomar([e()], HOJE)).toHaveLength(1);
    // 24/08 -> 22/11 são exatamente 90: é o dia, volta.
    expect(paraRetomar([e({ encerrada_em: "2026-08-24" })], HOJE)).toHaveLength(1);
    expect(paraRetomar([e({ encerrada_em: "2026-08-24T12:00:00Z" })], HOJE)).toHaveLength(1);
    // 25/08 são 89: ainda não.
    expect(paraRetomar([e({ encerrada_em: "2026-08-25" })], HOJE)).toEqual([]);
  });

  it("quem fechou não volta para a fila", () => {
    expect(paraRetomar([e({ stage: "Fechado" })], HOJE)).toEqual([]);
  });

  it("sem data de encerramento, não volta", () => {
    expect(paraRetomar([e({ encerrada_em: null })], HOJE)).toEqual([]);
  });

  it("o mais antigo primeiro, com o motivo junto", () => {
    const r = paraRetomar(
      [
        e({ id: "recente", encerrada_em: "2026-08-01" }),
        e({ id: "antigo", encerrada_em: "2026-01-10", lost_reason_kind: "Achou caro" }),
      ],
      HOJE,
    );
    expect(r.map((x) => x.lead.id)).toEqual(["antigo", "recente"]);
    expect(r[0].motivo).toBe("Achou caro");
  });
});
