import type { LeadStage } from "@/types";
import { ETAPAS_ABERTAS } from "@/lib/comercial/etapas";

/**
 * A tela "Hoje" do comercial.
 *
 * Do protótipo da Vitória: o que fazer HOJE, em caixas separadas, em
 * vez de uma lista só onde o atrasado se mistura com o da semana que
 * vem. Aqui mora a regra de quem cai em cada caixa; o desenho é da
 * página.
 *
 * Tudo trabalha com data em texto ("2026-11-22") e compara texto com
 * texto. Data em texto no formato ISO compara certo em ordem
 * alfabética, e assim nenhuma conta passa por `new Date()` — que, no
 * servidor em UTC e no navegador em Boa Vista, dá dias diferentes
 * perto da meia-noite.
 */

export interface ParaHoje {
  id: string;
  name: string;
  stage: LeadStage;
  /** A data combinada do próximo contato, "YYYY-MM-DD". */
  next_contact_on: string | null;
  estimated_monthly: number;
}

export interface Caixas<T> {
  /** Passou da data combinada. */
  atrasados: T[];
  /** A data combinada é hoje. */
  hoje: T[];
  /** Combinado para os próximos 7 dias. */
  semana: T[];
}

/** Soma dias a uma data em texto, sem passar por fuso nenhum. */
export function somarDias(data: string, dias: number): string {
  const [a, m, d] = data.split("-").map(Number);
  const t = Date.UTC(a, m - 1, d) + dias * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

/** Quantos dias de `de` até `ate`. Negativo quando `ate` já passou. */
export function diasEntre(de: string, ate: string): number {
  const n = (s: string) => {
    const [a, m, d] = s.split("-").map(Number);
    return Date.UTC(a, m - 1, d);
  };
  return Math.round((n(ate) - n(de)) / 86400000);
}

const VALIDA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Divide as oportunidades em aberto nas três caixas.
 *
 * Só entra quem está EM ABERTO e tem data combinada. Quem fechou ou
 * não fechou não tem próximo contato, e quem está em aberto sem data
 * não é atraso — é cadastro incompleto, e isso se resolve na ficha,
 * não aqui gritando em vermelho.
 */
export function caixasDoDia<T extends ParaHoje>(
  leads: T[],
  hoje: string,
): Caixas<T> {
  const limite = somarDias(hoje, 7);
  const abertas = leads.filter(
    (l) =>
      ETAPAS_ABERTAS.includes(l.stage) &&
      l.next_contact_on != null &&
      VALIDA.test(l.next_contact_on),
  );
  const por = (a: T, b: T) =>
    (a.next_contact_on ?? "") < (b.next_contact_on ?? "") ? -1 : 1;

  return {
    atrasados: abertas.filter((l) => l.next_contact_on! < hoje).sort(por),
    hoje: abertas.filter((l) => l.next_contact_on === hoje).sort(por),
    semana: abertas
      .filter((l) => l.next_contact_on! > hoje && l.next_contact_on! <= limite)
      .sort(por),
  };
}

/** Quantos pedem ação AGORA: o número que vai na aba. */
export function pedemAcao(c: Caixas<unknown>): number {
  return c.atrasados.length + c.hoje.length;
}

/**
 * "Atrasado há 3 dias", "hoje", "em 2 dias".
 *
 * Sem "venceu" e sem "perdeu o prazo": é um contato combinado que
 * passou da data, não uma conta em cartório.
 */
export function quandoFalar(data: string, hoje: string): string {
  const d = diasEntre(hoje, data);
  if (d === 0) return "hoje";
  if (d === 1) return "amanhã";
  if (d > 1) return `em ${d} dias`;
  if (d === -1) return "atrasado 1 dia";
  return `atrasado ${-d} dias`;
}

/* ------------------------------------------------------------------ */

export interface ParaRetomar {
  id: string;
  name: string;
  stage: LeadStage;
  /** Quando a oportunidade foi encerrada. */
  encerrada_em: string | null;
  lost_reason_kind: string | null;
  lost_reason: string | null;
}

/** Dias de espera antes de procurar de novo, por situação. */
export const ESPERA_NAO_FECHOU = 90;

/**
 * Quem já pode ser procurado de novo.
 *
 * Do protótipo: quem não fechou volta à fila 90 dias depois. Não é
 * insistência — é que "não é o momento" tem prazo de validade, e sem
 * isso essa gente some para sempre numa lista que ninguém abre.
 */
export function paraRetomar<T extends ParaRetomar>(
  encerradas: T[],
  hoje: string,
): { lead: T; dias: number; motivo: string | null }[] {
  return encerradas
    .filter(
      (l) =>
        l.stage === "Perdido" &&
        l.encerrada_em != null &&
        VALIDA.test(l.encerrada_em.slice(0, 10)) &&
        diasEntre(l.encerrada_em.slice(0, 10), hoje) >= ESPERA_NAO_FECHOU,
    )
    .map((l) => ({
      lead: l,
      dias: diasEntre(l.encerrada_em!.slice(0, 10), hoje),
      motivo: l.lost_reason_kind ?? l.lost_reason,
    }))
    .sort((a, b) => b.dias - a.dias);
}
