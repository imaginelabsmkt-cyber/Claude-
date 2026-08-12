import { describe, expect, it } from "vitest";
import {
  calcularVencimento,
  deveEnviarLembrete,
  estaAtrasada,
  formatarDataISO,
  resumoSemana,
  segundaDaSemana,
  somarDias,
} from "@/lib/rules/traffic";
import type { ChargeStatus } from "@/types";

function charge(over: {
  status?: ChargeStatus;
  amount?: number;
  due_date?: string | null;
  reference_week?: string;
  reminder_count?: number;
  last_reminder_at?: string | null;
}) {
  return {
    status: over.status ?? "Enviado",
    amount: over.amount ?? 100,
    due_date: over.due_date ?? null,
    reference_week: over.reference_week ?? "2026-08-10",
    reminder_count: over.reminder_count ?? 0,
    last_reminder_at: over.last_reminder_at ?? null,
  };
}

describe("segundaDaSemana", () => {
  it("retorna a própria segunda quando o dia é segunda", () => {
    // 2026-08-10 é uma segunda-feira.
    expect(segundaDaSemana(new Date(2026, 7, 10))).toBe("2026-08-10");
  });

  it("retorna a segunda anterior para uma quarta", () => {
    expect(segundaDaSemana(new Date(2026, 7, 12))).toBe("2026-08-10");
  });

  it("domingo pertence à semana que começou na segunda anterior", () => {
    // 2026-08-16 é domingo.
    expect(segundaDaSemana(new Date(2026, 7, 16))).toBe("2026-08-10");
  });
});

describe("formatarDataISO / somarDias / calcularVencimento", () => {
  it("formata com zero à esquerda", () => {
    expect(formatarDataISO(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("soma dias cruzando o mês", () => {
    expect(somarDias("2026-08-30", 3)).toBe("2026-09-02");
  });

  it("vencimento = semana + offset", () => {
    expect(calcularVencimento("2026-08-10", 2)).toBe("2026-08-12");
    expect(calcularVencimento("2026-08-10", 0)).toBe("2026-08-10");
  });
});

describe("estaAtrasada", () => {
  const hoje = new Date(2026, 7, 15);

  it("cobrança enviada e vencida está atrasada", () => {
    expect(estaAtrasada(charge({ due_date: "2026-08-12" }), hoje)).toBe(true);
  });

  it("cobrança com vencimento futuro não está atrasada", () => {
    expect(estaAtrasada(charge({ due_date: "2026-08-20" }), hoje)).toBe(false);
  });

  it("cobrança paga nunca está atrasada", () => {
    expect(
      estaAtrasada(charge({ status: "Pago", due_date: "2026-08-01" }), hoje),
    ).toBe(false);
  });

  it("cobrança cancelada nunca está atrasada", () => {
    expect(
      estaAtrasada(charge({ status: "Cancelado", due_date: "2026-08-01" }), hoje),
    ).toBe(false);
  });

  it("usa a semana de referência quando não há vencimento", () => {
    expect(
      estaAtrasada(charge({ due_date: null, reference_week: "2026-08-10" }), hoje),
    ).toBe(true);
  });
});

describe("deveEnviarLembrete", () => {
  const settings = { reminder_days: 2, reminder_interval: 2, reminder_max: 3 };
  const hoje = new Date(2026, 7, 15); // sábado

  it("lembra cobrança enviada, vencida e sem lembrete anterior", () => {
    expect(
      deveEnviarLembrete(charge({ due_date: "2026-08-12" }), settings, hoje),
    ).toBe(true);
  });

  it("não lembra cobrança ainda não enviada (Pendente)", () => {
    expect(
      deveEnviarLembrete(
        charge({ status: "Pendente", due_date: "2026-08-12" }),
        settings,
        hoje,
      ),
    ).toBe(false);
  });

  it("não lembra antes de reminder_days de atraso", () => {
    // vence 2026-08-14, hoje 15 -> só 1 dia de atraso (< 2).
    expect(
      deveEnviarLembrete(charge({ due_date: "2026-08-14" }), settings, hoje),
    ).toBe(false);
  });

  it("respeita o máximo de lembretes", () => {
    expect(
      deveEnviarLembrete(
        charge({ due_date: "2026-08-01", reminder_count: 3 }),
        settings,
        hoje,
      ),
    ).toBe(false);
  });

  it("respeita o intervalo desde o último lembrete", () => {
    expect(
      deveEnviarLembrete(
        charge({ due_date: "2026-08-01", last_reminder_at: "2026-08-14T10:00:00Z" }),
        settings,
        hoje,
      ),
    ).toBe(false);
  });

  it("lembra de novo quando o intervalo já passou", () => {
    expect(
      deveEnviarLembrete(
        charge({ due_date: "2026-08-01", last_reminder_at: "2026-08-12T10:00:00Z" }),
        settings,
        hoje,
      ),
    ).toBe(true);
  });
});

describe("resumoSemana", () => {
  const hoje = new Date(2026, 7, 15);

  it("consolida contagens e valores, ignorando cancelados", () => {
    const r = resumoSemana(
      [
        charge({ status: "Pago", amount: 100 }),
        charge({ status: "Enviado", amount: 200, due_date: "2026-08-12" }), // atrasada
        charge({ status: "Enviado", amount: 50, due_date: "2026-08-30" }), // em dia
        charge({ status: "Pendente", amount: 80 }),
        charge({ status: "Cancelado", amount: 999 }),
      ],
      hoje,
    );

    expect(r.total).toBe(5);
    expect(r.pagas).toBe(1);
    expect(r.enviadas).toBe(2);
    expect(r.pendentes).toBe(1);
    expect(r.atrasadas).toBe(2); // a Enviada vencida + a Pendente (ref-week passada)
    expect(r.valorTotal).toBe(430); // 100+200+50+80, sem o cancelado
    expect(r.valorRecebido).toBe(100);
    expect(r.valorEmAberto).toBe(330);
  });
});
