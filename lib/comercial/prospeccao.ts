/**
 * =============================================================
 * PROSPECÇÃO — de onde vêm os clientes
 * =============================================================
 * Regras puras da tela de Prospecção. Sem banco aqui, para poder
 * ser testado.
 *
 * A pergunta que esta tela responde é UMA: **em qual canal vale a
 * pena gastar a próxima hora?**
 *
 * Por isso o que importa não é quantos leads cada canal trouxe — é
 * quantos viraram cliente e quanto isso virou por mês. Um canal que
 * traz 40 contatos e fecha zero é pior que um que traz 4 e fecha 2,
 * e qualquer leitura que só conte leads diria o contrário.
 * =============================================================
 */

import { arredondar, dividirSeguro, somar } from "@/lib/financeiro/calculo";
import type { LeadChannel, LeadStage } from "@/types";

/** O mínimo que uma oportunidade precisa ter para entrar na conta. */
export interface OportunidadeProspeccao {
  channel: LeadChannel;
  stage: LeadStage;
  estimated_monthly: number;
}

/** As etapas do funil na ordem, da primeira conversa ao fechamento. */
export const ETAPAS_DO_FUNIL: LeadStage[] = [
  "Contato feito",
  "Diagnóstico",
  "Proposta enviada",
  "Negociação",
  "Fechado",
];

export interface DegrauDoFunil {
  etapa: LeadStage;
  /**
   * Quantas oportunidades CHEGARAM nesta etapa — inclui as que já
   * seguiram adiante. Sem isso o funil mostraria só a foto de hoje
   * ("3 em negociação") em vez do caminho ("de 40 abordados, 3
   * chegaram à negociação"), que é o que ensina alguma coisa.
   */
  chegaram: number;
  /** Quantas estão paradas nesta etapa agora. */
  agora: number;
  /** Fração das que chegaram aqui em relação ao topo do funil (0..1). */
  doTopo: number;
}

/**
 * Monta o funil acumulado.
 *
 * "Perdido" não é uma etapa do funil: é a saída. Uma oportunidade
 * perdida na negociação CHEGOU à negociação, e some do funil se a
 * gente olhar só a etapa atual. Por isso ela precisa carregar até
 * onde chegou — `stageMaxima` resolve isso.
 */
export function montarFunil<T extends OportunidadeProspeccao>(
  oportunidades: T[],
  stageMaxima: (o: T) => LeadStage,
): DegrauDoFunil[] {
  const indice = (e: LeadStage) => ETAPAS_DO_FUNIL.indexOf(e);

  const degraus = ETAPAS_DO_FUNIL.map((etapa) => {
    const i = indice(etapa);
    return {
      etapa,
      chegaram: oportunidades.filter((o) => indice(stageMaxima(o)) >= i).length,
      agora: oportunidades.filter((o) => o.stage === etapa).length,
      doTopo: 0,
    };
  });

  const topo = degraus[0]?.chegaram ?? 0;
  return degraus.map((d) => ({ ...d, doTopo: dividirSeguro(d.chegaram, topo) }));
}

export interface ResultadoDoCanal {
  canal: LeadChannel;
  /** Oportunidades que vieram deste canal. */
  total: number;
  /** Ainda em jogo (nem fechadas, nem perdidas). */
  abertas: number;
  /** Viraram cliente. */
  fechadas: number;
  /** Não viraram. */
  perdidas: number;
  /** fechadas / (fechadas + perdidas) — só conta o que já se decidiu. */
  conversao: number;
  /** Mensalidade somada do que este canal fechou. */
  receitaFechada: number;
  /** Mensalidade somada do que ainda está em jogo. */
  receitaEmJogo: number;
}

/**
 * Resultado por canal, do que mais fechou para o que menos fechou.
 *
 * A conversão ignora as oportunidades abertas de propósito: incluir
 * no denominador quem ainda nem decidiu faz um canal novo parecer
 * ruim só por ser novo.
 */
export function resultadoPorCanal<T extends OportunidadeProspeccao>(
  oportunidades: T[],
  canais: LeadChannel[],
): ResultadoDoCanal[] {
  const linhas = canais.map((canal) => {
    const deste = oportunidades.filter((o) => o.channel === canal);
    const fechadas = deste.filter((o) => o.stage === "Fechado");
    const perdidas = deste.filter((o) => o.stage === "Perdido");
    const abertas = deste.filter(
      (o) => o.stage !== "Fechado" && o.stage !== "Perdido",
    );
    const valor = (l: T[]) =>
      somar(l.map((o) => Number(o.estimated_monthly) || 0));

    return {
      canal,
      total: deste.length,
      abertas: abertas.length,
      fechadas: fechadas.length,
      perdidas: perdidas.length,
      conversao: dividirSeguro(
        fechadas.length,
        fechadas.length + perdidas.length,
      ),
      receitaFechada: valor(fechadas),
      receitaEmJogo: valor(abertas),
    };
  });

  return linhas.sort(
    (a, b) =>
      b.receitaFechada - a.receitaFechada ||
      b.fechadas - a.fechadas ||
      b.total - a.total,
  );
}

/**
 * Quantos contatos novos são precisos para fechar mais um cliente,
 * na taxa que a carteira vem mostrando.
 *
 * É a conta que o guia da Vitória faz na mão ("100 abordados → 1
 * fecha"), só que com os números de verdade em vez de uma média de
 * mercado. Devolve null enquanto não houver fechamento nenhum — um
 * palpite aqui seria pior que silêncio.
 */
export function contatosPorCliente(funil: DegrauDoFunil[]): number | null {
  const topo = funil[0]?.chegaram ?? 0;
  const fecharam = funil[funil.length - 1]?.chegaram ?? 0;
  if (!topo || !fecharam) return null;
  return arredondar(topo / fecharam);
}
