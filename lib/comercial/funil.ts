/**
 * Regras do funil comercial.
 *
 * Funções PURAS (sem banco, sem React), cobertas por testes. A mais
 * importante é `dadosDoFechamento`: ela decide o que nasce quando uma
 * oportunidade é ganha — o cliente e a mensalidade — para que a server
 * action apenas grave o que esta função devolve.
 */

import { arredondar, somar } from "@/lib/financeiro/calculo";
import { deslocarMes, partesMes } from "@/lib/financeiro/meses";
import type { Lead, LeadStage, Proposal } from "@/types";

/**
 * Quantos dias uma oportunidade pode ficar parada em cada etapa antes
 * de merecer uma cutucada. São os prazos de uma agência pequena, onde
 * follow-up lento é a principal causa de proposta que esfria.
 */
export const LIMITE_PARADO: Record<LeadStage, number> = {
  "Contato feito": 3,
  Diagnóstico: 5,
  "Proposta enviada": 5,
  Negociação: 7,
  Fechado: Infinity,
  Perdido: Infinity,
};

/** Etapas que ainda estão em jogo (não encerradas). */
export const ETAPAS_ABERTAS: LeadStage[] = [
  "Contato feito",
  "Diagnóstico",
  "Proposta enviada",
  "Negociação",
];

/** A oportunidade ainda está em jogo? */
export function estaAberta(lead: Pick<Lead, "stage">): boolean {
  return ETAPAS_ABERTAS.includes(lead.stage);
}

/** Dias inteiros entre duas datas (ignora a hora). */
function diasEntre(de: Date, ate: Date): number {
  const a = new Date(de.getFullYear(), de.getMonth(), de.getDate());
  const b = new Date(ate.getFullYear(), ate.getMonth(), ate.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Há quantos dias a oportunidade está na etapa atual. */
export function diasParado(
  lead: Pick<Lead, "stage_changed_at">,
  hoje: Date = new Date(),
): number {
  return Math.max(diasEntre(new Date(lead.stage_changed_at), hoje), 0);
}

/**
 * A oportunidade passou do prazo da etapa? Oportunidade encerrada
 * nunca está parada.
 */
export function estaParado(
  lead: Pick<Lead, "stage" | "stage_changed_at">,
  hoje: Date = new Date(),
): boolean {
  if (!estaAberta(lead)) return false;
  return diasParado(lead, hoje) > LIMITE_PARADO[lead.stage];
}

/**
 * Valor do funil: quanto entraria por mês se tudo que está aberto
 * fechasse. Não aplica peso por etapa — numa carteira de poucos
 * clientes, um número ponderado engana mais do que ajuda.
 */
export function valorDoFunil(
  leads: Pick<Lead, "stage" | "estimated_monthly">[],
): number {
  return somar(
    leads.filter(estaAberta).map((l) => Number(l.estimated_monthly)),
  );
}

/**
 * A proposta que vale agora: a mais recente que não foi recusada.
 * (Uma segunda proposta depois da negociação substitui a primeira.)
 */
export function propostaVigente(propostas: Proposal[]): Proposal | null {
  const validas = propostas
    .filter((p) => p.status !== "Recusada")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return validas[0] ?? null;
}

/** A proposta passou da validade sem resposta? */
export function propostaVencida(
  proposta: Pick<Proposal, "status" | "valid_until">,
  hoje: Date = new Date(),
): boolean {
  if (proposta.status !== "Enviada" || !proposta.valid_until) return false;
  const [a, m, d] = proposta.valid_until.split("-").map(Number);
  return diasEntre(hoje, new Date(a, m - 1, d)) < 0;
}

/**
 * Quantos clientes do tamanho médio faltam para cobrir uma diferença.
 * Devolve 0 quando não falta nada e null quando não há base de cálculo.
 */
export function clientesParaCobrir(
  falta: number,
  ticketMedio: number,
): number | null {
  if (falta <= 0) return 0;
  if (ticketMedio <= 0) return null;
  return Math.ceil(falta / ticketMedio);
}

/** O que nasce quando uma oportunidade é ganha. */
export interface DadosFechamento {
  cliente: {
    name: string;
    active: true;
    monthly_goal: number | null;
    notes: string | null;
  };
  recorrencia: {
    description: string;
    amount: number;
    start_month: string;
    /** null = contrato sem prazo para acabar. */
    end_month: string | null;
    due_day: number | null;
  };
  /** Lançamento avulso do setup, quando a proposta cobra entrada. */
  setup: { description: string; amount: number; reference_month: string } | null;
}

export interface OpcoesFechamento {
  /** Mês em que a mensalidade começa ("YYYY-MM"). */
  mesInicio: string;
  /** Duração do contrato em meses. 0 ou ausente = sem prazo. */
  meses?: number;
  /** Dia do vencimento da mensalidade. */
  diaVencimento?: number | null;
}

/**
 * Traduz "ganhei este negócio" em cliente + mensalidade + setup.
 *
 * É aqui que o ciclo se fecha: o valor da proposta vira a mensalidade
 * do financeiro sem ninguém redigitar, e a duração vira a vigência —
 * que é o que faz o alerta de renovação aparecer no Início.
 *
 * Sem proposta, cai no valor estimado do lead.
 */
export function dadosDoFechamento(
  lead: Pick<Lead, "name" | "estimated_monthly" | "notes">,
  proposta: Proposal | null,
  opcoes: OpcoesFechamento,
): DadosFechamento {
  const mensal = arredondar(
    proposta ? Number(proposta.monthly_amount) : Number(lead.estimated_monthly),
  );
  const meses = opcoes.meses && opcoes.meses > 0 ? opcoes.meses : 0;
  const setup = proposta ? arredondar(Number(proposta.setup_amount)) : 0;

  return {
    cliente: {
      name: lead.name.trim(),
      active: true,
      monthly_goal: proposta?.monthly_goal ?? null,
      notes: proposta?.scope ?? lead.notes ?? null,
    },
    recorrencia: {
      description: `Mensalidade ${lead.name.trim()}`,
      amount: mensal,
      start_month: opcoes.mesInicio,
      // A vigência termina no último mês incluído: início + (meses - 1).
      end_month: meses > 0 ? deslocarMes(opcoes.mesInicio, meses - 1) : null,
      due_day: opcoes.diaVencimento ?? null,
    },
    setup:
      setup > 0
        ? {
            description: `Entrada / setup ${lead.name.trim()}`,
            amount: setup,
            reference_month: opcoes.mesInicio,
          }
        : null,
  };
}


// -------------------------------------------------------------
// Renovação de contrato
// -------------------------------------------------------------

/**
 * O contrato de um cliente é a mensalidade recorrente: o `end_month`
 * dela é a data em que a vigência acaba. Isto é o mínimo que as regras
 * de renovação precisam saber.
 */
export interface ContratoVigente {
  id: string;
  description: string;
  clientId: string | null;
  amount: number;
  /** Último mês coberto pelo contrato ("YYYY-MM"); null = sem prazo. */
  endMonth: string | null;
  active: boolean;
}

/** Um contrato chegando ao fim. */
export interface Renovacao {
  id: string;
  description: string;
  clientId: string | null;
  amount: number;
  /** Último mês do contrato. */
  endMonth: string;
  /** Data do último dia coberto ("YYYY-MM-DD"). */
  data: string;
  /** Dias até acabar (negativo = já acabou). */
  dias: number;
}

/** Último dia de um mês "YYYY-MM", como "YYYY-MM-DD". */
export function ultimoDiaDoMes(mes: string): string | null {
  const { ano, mes: m } = partesMes(mes);
  if (!ano) return null;
  const dia = new Date(ano, m, 0).getDate();
  return `${mes}-${String(dia).padStart(2, "0")}`;
}

/**
 * Contratos que vencem dentro do horizonte (ou que já venceram e ainda
 * estão ativos — o caso que mais dói, porque a mensalidade segue sendo
 * gerada sem contrato que a sustente).
 *
 * Contrato sem `end_month` não renova: não tem prazo para acabar.
 */
export function renovacoesProximas(
  contratos: ContratoVigente[],
  hoje: Date = new Date(),
  horizonteDias = 45,
): Renovacao[] {
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  return contratos
    .filter((c) => c.active && c.endMonth)
    .map((c) => {
      const data = ultimoDiaDoMes(c.endMonth!);
      if (!data) return null;
      const [a, m, d] = data.split("-").map(Number);
      const dias = Math.round(
        (new Date(a, m - 1, d).getTime() - base.getTime()) / 86_400_000,
      );
      return {
        id: c.id,
        description: c.description,
        clientId: c.clientId,
        amount: c.amount,
        endMonth: c.endMonth!,
        data,
        dias,
      };
    })
    .filter((r): r is Renovacao => r !== null && r.dias <= horizonteDias)
    .sort((a, b) => a.dias - b.dias);
}

/** Texto do aviso de renovação. */
export function textoRenovacao(r: Renovacao): string {
  if (r.dias < 0) return `venceu há ${Math.abs(r.dias)} dias`;
  if (r.dias === 0) return "acaba hoje";
  if (r.dias === 1) return "acaba amanhã";
  return `renova em ${r.dias} dias`;
}
