/**
 * As etapas do funil, com o que cada uma é e quando voltar.
 *
 * Fonte única. Antes isso estava espalhado: a ordem num arquivo, o
 * prazo de "parado" noutro, a lista de abertas num terceiro, e o que
 * cada etapa significa em lugar nenhum — a pessoa tinha que adivinhar
 * a diferença entre uma e outra.
 *
 * O desenho vem do protótipo que a Vitória montou, com DUAS
 * correções que a Fran deu em voz alta e que o protótipo não tem:
 *
 *   "A gente não envia a proposta, a gente já apresenta na primeira
 *    reunião."   -> é "Proposta apresentada", não "Proposta enviada".
 *
 *   "O diagnóstico a gente faz justamente antes de encontrar o
 *    cliente."   -> "Diagnóstico" existe, embora o protótipo não
 *                   tenha a etapa.
 *
 * E "Reunião feita" do protótipo não entra: se a proposta é
 * apresentada NA reunião, as duas são o mesmo momento.
 */

import type { LeadStage } from "@/types";

export interface Etapa {
  id: LeadStage;
  /** O que está acontecendo, em uma linha. */
  descricao: string;
  /**
   * Daqui a quantos dias falar de novo, ao chegar nesta etapa.
   *
   * `null` quando a data vem de outro lugar: "Reunião marcada" tem a
   * data da reunião, e as encerradas não têm próximo contato.
   */
  diasAteOProximoContato: number | null;
  /** O que fazer agora. Aparece embaixo do nome da coluna no quadro. */
  oQueFazer: string;
}

export const ETAPAS: Etapa[] = [
  {
    id: "Novo lead",
    descricao: "Chegou e ainda não teve contato.",
    diasAteOProximoContato: 0,
    oQueFazer: "Fazer o primeiro contato hoje.",
  },
  {
    id: "Primeiro contato",
    descricao: "Mensagem enviada, esperando resposta.",
    diasAteOProximoContato: 1,
    oQueFazer: "Sem resposta: amanhã, depois em 2 dias, depois em 1 semana.",
  },
  {
    id: "Em conversa",
    descricao: "Respondeu, mas ainda não marcou reunião.",
    diasAteOProximoContato: 2,
    oQueFazer: "Puxar para a reunião em até 2 dias.",
  },
  {
    id: "Diagnóstico",
    descricao: "Analisando a operação antes de encontrar o cliente.",
    diasAteOProximoContato: 3,
    oQueFazer: "Fechar o diagnóstico e marcar a reunião.",
  },
  {
    id: "Reunião marcada",
    descricao: "Data e hora combinadas.",
    diasAteOProximoContato: null,
    oQueFazer: "A data da reunião é o próximo contato.",
  },
  {
    id: "Proposta apresentada",
    descricao: "Apresentada na reunião. Valores na mão do cliente.",
    diasAteOProximoContato: 2,
    oQueFazer: "Perguntar se ficou dúvida em 2 dias.",
  },
  {
    id: "Negociação",
    descricao: "Ajustando condição, esperando decisão.",
    diasAteOProximoContato: 3,
    oQueFazer: "Contato a cada 3 dias, sem pressionar.",
  },
  {
    id: "Fechado",
    descricao: "Contrato fechado. Vira cliente no Administrativo.",
    diasAteOProximoContato: null,
    oQueFazer: "Aproveitar e pedir indicação.",
  },
  {
    id: "Perdido",
    descricao: "Não fechou. O motivo fica registrado.",
    diasAteOProximoContato: null,
    oQueFazer: "Volta para a fila em 90 dias.",
  },
];

/** Etapas em que a oportunidade ainda está em jogo. */
export const ETAPAS_ABERTAS: LeadStage[] = ETAPAS.filter(
  (e) => e.id !== "Fechado" && e.id !== "Perdido",
).map((e) => e.id);

const PORE_ID = new Map(ETAPAS.map((e) => [e.id, e]));

/** A etapa pelo id. */
export function etapa(id: LeadStage): Etapa {
  return PORE_ID.get(id) ?? ETAPAS[0];
}

/**
 * A data sugerida do próximo contato ao chegar numa etapa.
 *
 * Devolve "YYYY-MM-DD" ou `null` quando a etapa não marca contato por
 * si (a reunião tem a data dela; o que encerrou não tem próximo).
 */
export function proximoContatoSugerido(
  id: LeadStage,
  hoje: string,
): string | null {
  const dias = etapa(id).diasAteOProximoContato;
  if (dias === null) return null;
  const d = new Date(`${hoje}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * Como a etapa aparece NA TELA.
 *
 * O banco guarda "Perdido" — é um valor de enum, e trocar valor de
 * enum é migração. Mas a Fran: "ganhamos, perdemos, essas coisas
 * assim, num sistema de uma empresa institucional ninguém faz isso".
 * Então o nome guardado continua "Perdido" e o nome escrito é "Não
 * fechou". Quem lê vê a língua certa; quem consulta o banco acha o
 * registro.
 */
const ROTULO: Partial<Record<LeadStage, string>> = {
  Perdido: "Não fechou",
};

export function rotuloDaEtapa(id: LeadStage): string {
  return ROTULO[id] ?? id;
}
