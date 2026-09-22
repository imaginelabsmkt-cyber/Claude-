import { describe, it, expect } from "vitest";
import {
  clientesParaCobrir,
  dadosDoFechamento,
  diasParado,
  estaAberta,
  estaParado,
  propostaVencida,
  propostaVigente,
  renovacoesProximas,
  textoRenovacao,
  ultimoDiaDoMes,
  valorDoFunil,
  type ContratoVigente,
} from "@/lib/comercial/funil";
import type { Lead, Proposal } from "@/types";

const HOJE = new Date(2026, 8, 21); // 21/09/2026

function lead(over: Partial<Lead> = {}): Lead {
  return {
    id: "l1",
    name: "Studio Ravel",
    contact_name: null,
    contact_email: null,
    contact_phone: null,
    source: null,
    stage: "Proposta enviada",
    estimated_monthly: 1900,
    notes: null,
    client_id: null,
    lost_reason: null,
    stage_changed_at: "2026-09-20T12:00:00Z",
    created_at: "2026-09-01T12:00:00Z",
    updated_at: "2026-09-20T12:00:00Z",
    ...over,
  };
}

function proposta(over: Partial<Proposal> = {}): Proposal {
  return {
    id: "p1",
    lead_id: "l1",
    status: "Enviada",
    monthly_amount: 1900,
    setup_amount: 0,
    scope: null,
    monthly_goal: null,
    sent_at: "2026-09-15",
    valid_until: null,
    notes: null,
    created_at: "2026-09-15T12:00:00Z",
    updated_at: "2026-09-15T12:00:00Z",
    ...over,
  };
}

describe("etapas", () => {
  it("sabe o que ainda está em jogo", () => {
    expect(estaAberta(lead({ stage: "Negociação" }))).toBe(true);
    expect(estaAberta(lead({ stage: "Fechado" }))).toBe(false);
    expect(estaAberta(lead({ stage: "Perdido" }))).toBe(false);
  });
});

describe("parado há quanto tempo", () => {
  it("conta os dias desde a última mudança de etapa", () => {
    expect(diasParado(lead({ stage_changed_at: "2026-09-21T09:00:00" }), HOJE)).toBe(0);
    expect(diasParado(lead({ stage_changed_at: "2026-09-18T09:00:00" }), HOJE)).toBe(3);
  });

  it("nunca devolve dias negativos", () => {
    expect(diasParado(lead({ stage_changed_at: "2026-09-25T09:00:00" }), HOJE)).toBe(0);
  });

  it("aplica o limite de cada etapa", () => {
    // "Contato feito" tolera 3 dias; "Negociação" tolera 7.
    const parado4 = { stage_changed_at: "2026-09-17T09:00:00" };
    expect(estaParado({ stage: "Contato feito", ...parado4 }, HOJE)).toBe(true);
    expect(estaParado({ stage: "Negociação", ...parado4 }, HOJE)).toBe(false);
  });

  it("oportunidade encerrada nunca está parada", () => {
    const antigo = { stage_changed_at: "2026-01-01T09:00:00" };
    expect(estaParado({ stage: "Fechado", ...antigo }, HOJE)).toBe(false);
    expect(estaParado({ stage: "Perdido", ...antigo }, HOJE)).toBe(false);
  });
});

describe("valorDoFunil", () => {
  it("soma só o que está aberto", () => {
    const total = valorDoFunil([
      lead({ stage: "Contato feito", estimated_monthly: 1200 }),
      lead({ stage: "Negociação", estimated_monthly: 1500 }),
      lead({ stage: "Fechado", estimated_monthly: 9999 }),
      lead({ stage: "Perdido", estimated_monthly: 8888 }),
    ]);
    expect(total).toBe(2700);
  });

  it("devolve zero quando não há nada aberto", () => {
    expect(valorDoFunil([lead({ stage: "Fechado" })])).toBe(0);
    expect(valorDoFunil([])).toBe(0);
  });
});

describe("propostas", () => {
  it("a vigente é a mais recente que não foi recusada", () => {
    const antiga = proposta({ id: "a", created_at: "2026-09-01T12:00:00Z", monthly_amount: 2100 });
    const recusada = proposta({ id: "b", created_at: "2026-09-20T12:00:00Z", status: "Recusada" });
    const nova = proposta({ id: "c", created_at: "2026-09-10T12:00:00Z", monthly_amount: 1900 });
    expect(propostaVigente([antiga, recusada, nova])?.id).toBe("c");
  });

  it("devolve null quando todas foram recusadas", () => {
    expect(propostaVigente([proposta({ status: "Recusada" })])).toBeNull();
    expect(propostaVigente([])).toBeNull();
  });

  it("só considera vencida uma proposta enviada com prazo passado", () => {
    expect(propostaVencida({ status: "Enviada", valid_until: "2026-09-20" }, HOJE)).toBe(true);
    expect(propostaVencida({ status: "Enviada", valid_until: "2026-09-21" }, HOJE)).toBe(false);
    expect(propostaVencida({ status: "Enviada", valid_until: null }, HOJE)).toBe(false);
    expect(propostaVencida({ status: "Aceita", valid_until: "2026-01-01" }, HOJE)).toBe(false);
  });
});

describe("clientesParaCobrir", () => {
  it("arredonda para cima", () => {
    // O buraco real da agência: R$ 3.036,55 com ticket médio de R$ 1.858,33.
    expect(clientesParaCobrir(3036.55, 1858.33)).toBe(2);
    expect(clientesParaCobrir(1900, 1900)).toBe(1);
  });

  it("devolve 0 quando não falta nada e null sem base", () => {
    expect(clientesParaCobrir(0, 1500)).toBe(0);
    expect(clientesParaCobrir(-500, 1500)).toBe(0);
    expect(clientesParaCobrir(1000, 0)).toBeNull();
  });
});

describe("dadosDoFechamento", () => {
  it("usa o valor da proposta e calcula a vigência", () => {
    const d = dadosDoFechamento(
      lead({ name: "Studio Ravel", estimated_monthly: 1700 }),
      proposta({ monthly_amount: 1900, monthly_goal: 8, scope: "8 conteúdos/mês" }),
      { mesInicio: "2026-10", meses: 12, diaVencimento: 10 },
    );

    expect(d.cliente.name).toBe("Studio Ravel");
    expect(d.cliente.monthly_goal).toBe(8);
    expect(d.cliente.notes).toBe("8 conteúdos/mês");
    expect(d.recorrencia.amount).toBe(1900); // proposta vence o estimado
    expect(d.recorrencia.description).toBe("Mensalidade Studio Ravel");
    expect(d.recorrencia.start_month).toBe("2026-10");
    // 12 meses a partir de outubro terminam em setembro do ano seguinte.
    expect(d.recorrencia.end_month).toBe("2027-09");
    expect(d.recorrencia.due_day).toBe(10);
    expect(d.setup).toBeNull();
  });

  it("sem prazo definido, o contrato não tem fim", () => {
    const d = dadosDoFechamento(lead(), proposta(), { mesInicio: "2026-11" });
    expect(d.recorrencia.end_month).toBeNull();

    const zero = dadosDoFechamento(lead(), proposta(), { mesInicio: "2026-11", meses: 0 });
    expect(zero.recorrencia.end_month).toBeNull();
  });

  it("contrato de 1 mês começa e termina no mesmo mês", () => {
    const d = dadosDoFechamento(lead(), proposta(), { mesInicio: "2026-10", meses: 1 });
    expect(d.recorrencia.end_month).toBe("2026-10");
  });

  it("sem proposta, cai no valor estimado do lead", () => {
    const d = dadosDoFechamento(
      lead({ name: "Clínica Ventre", estimated_monthly: 1400, notes: "veio por indicação" }),
      null,
      { mesInicio: "2026-10" },
    );
    expect(d.recorrencia.amount).toBe(1400);
    expect(d.cliente.monthly_goal).toBeNull();
    expect(d.cliente.notes).toBe("veio por indicação");
  });

  it("proposta com entrada gera o lançamento avulso de setup", () => {
    const d = dadosDoFechamento(
      lead({ name: "Espaço Lumina" }),
      proposta({ monthly_amount: 1500, setup_amount: 800 }),
      { mesInicio: "2026-10" },
    );
    expect(d.setup).toEqual({
      description: "Entrada / setup Espaço Lumina",
      amount: 800,
      reference_month: "2026-10",
    });
  });

  it("limpa espaços no nome do cliente", () => {
    const d = dadosDoFechamento(lead({ name: "  Ateliê Flor de Sal  " }), null, {
      mesInicio: "2026-10",
    });
    expect(d.cliente.name).toBe("Ateliê Flor de Sal");
    expect(d.recorrencia.description).toBe("Mensalidade Ateliê Flor de Sal");
  });
});

describe("renovação de contrato", () => {
  function contrato(over: Partial<ContratoVigente> = {}): ContratoVigente {
    return {
      id: "r1",
      description: "Mensalidade Kiku Sushi",
      clientId: "cli-1",
      amount: 2200,
      endMonth: "2026-10",
      active: true,
      ...over,
    };
  }

  it("último dia do mês respeita o calendário", () => {
    expect(ultimoDiaDoMes("2026-10")).toBe("2026-10-31");
    expect(ultimoDiaDoMes("2026-11")).toBe("2026-11-30");
    expect(ultimoDiaDoMes("2026-02")).toBe("2026-02-28");
    expect(ultimoDiaDoMes("2028-02")).toBe("2028-02-29");
    expect(ultimoDiaDoMes("nada")).toBeNull();
  });

  it("avisa contrato que acaba dentro do horizonte", () => {
    // 21/09 -> 31/10 são 40 dias.
    const r = renovacoesProximas([contrato()], HOJE, 45);
    expect(r).toHaveLength(1);
    expect(r[0].dias).toBe(40);
    expect(r[0].data).toBe("2026-10-31");
  });

  it("ignora contrato que acaba longe demais", () => {
    expect(renovacoesProximas([contrato({ endMonth: "2027-09" })], HOJE, 45)).toEqual([]);
  });

  it("contrato sem prazo nunca renova", () => {
    expect(renovacoesProximas([contrato({ endMonth: null })], HOJE)).toEqual([]);
  });

  it("contrato pausado não entra", () => {
    expect(renovacoesProximas([contrato({ active: false })], HOJE)).toEqual([]);
  });

  it("contrato vencido e ainda ativo é o mais urgente", () => {
    const r = renovacoesProximas(
      [
        contrato({ id: "futuro", endMonth: "2026-10" }),
        contrato({ id: "vencido", endMonth: "2026-08" }),
      ],
      HOJE,
    );
    expect(r[0].id).toBe("vencido");
    expect(r[0].dias).toBeLessThan(0);
  });

  it("descreve o prazo em português", () => {
    const base = { id: "x", description: "d", clientId: null, amount: 0, endMonth: "2026-10", data: "2026-10-31" };
    expect(textoRenovacao({ ...base, dias: -3 })).toBe("venceu há 3 dias");
    expect(textoRenovacao({ ...base, dias: 0 })).toBe("acaba hoje");
    expect(textoRenovacao({ ...base, dias: 1 })).toBe("acaba amanhã");
    expect(textoRenovacao({ ...base, dias: 12 })).toBe("renova em 12 dias");
  });
});
