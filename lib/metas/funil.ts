import type { LeadStage } from "@/types";
import { ETAPAS, ETAPAS_ABERTAS } from "@/lib/comercial/etapas";

/**
 * O funil comercial, do jeito que as Metas precisam vê-lo.
 *
 * A Fran: "você colocou nas metas a prospecção dos clientes, só que
 * aí você tem que levar o comercial em consideração, quantos clientes
 * a gente está em negociação ou a gente está em conversa. E aí já
 * atualizar essas informações automaticamente."
 *
 * A projeção tinha um buraco: ela pedia "12 clientes novos" e não
 * dizia de onde eles sairiam. O funil sabe quem são, em que pé estão
 * e quanto cada um vale, e isso estava numa tela ao lado.
 *
 * Função pura: entram as oportunidades, sai o retrato.
 */

export interface OportunidadeDoFunil {
  id: string;
  name: string;
  stage: LeadStage;
  estimated_monthly: number;
}

export interface EtapaNoFunil {
  etapa: LeadStage;
  quantas: number;
  valor: number;
  /** A etapa já passou da reunião: é onde a decisão está perto. */
  adiantada: boolean;
}

export interface FunilParaMetas {
  porEtapa: EtapaNoFunil[];
  /** Todas as abertas. */
  quantas: number;
  valor: number;
  /** Mensalidade média das abertas com valor. */
  ticketMedio: number | null;
  /** Só as que já passaram da reunião. */
  quantasAdiantadas: number;
  valorAdiantado: number;
}

/**
 * As etapas em que a decisão está perto.
 *
 * Da reunião marcada em diante: antes disso ainda não houve conversa
 * de valor, e contar um "Novo lead" frio como receita quase certa é o
 * jeito mais rápido de a projeção mentir.
 */
const ADIANTADAS: LeadStage[] = [
  "Reunião marcada",
  "Proposta apresentada",
  "Negociação",
];

export function ehAdiantada(etapa: LeadStage): boolean {
  return ADIANTADAS.includes(etapa);
}

export function resumoDoFunil(
  oportunidades: OportunidadeDoFunil[],
): FunilParaMetas {
  const abertas = oportunidades.filter((o) =>
    ETAPAS_ABERTAS.includes(o.stage),
  );

  /* Toda etapa aberta aparece, mesmo vazia: um funil com buraco no
     meio é informação, e some se a tela só listar o que tem gente. */
  const porEtapa: EtapaNoFunil[] = ETAPAS.filter((e) =>
    ETAPAS_ABERTAS.includes(e.id),
  ).map((e) => {
    const dela = abertas.filter((o) => o.stage === e.id);
    return {
      etapa: e.id,
      quantas: dela.length,
      valor: dela.reduce((t, o) => t + o.estimated_monthly, 0),
      adiantada: ehAdiantada(e.id),
    };
  });

  const comValor = abertas.filter((o) => o.estimated_monthly > 0);
  const valor = abertas.reduce((t, o) => t + o.estimated_monthly, 0);
  const adiantadas = abertas.filter((o) => ehAdiantada(o.stage));

  return {
    porEtapa,
    quantas: abertas.length,
    valor,
    ticketMedio: comValor.length
      ? comValor.reduce((t, o) => t + o.estimated_monthly, 0) / comValor.length
      : null,
    quantasAdiantadas: adiantadas.length,
    valorAdiantado: adiantadas.reduce((t, o) => t + o.estimated_monthly, 0),
  };
}

/**
 * O funil cobre o que a projeção pede?
 *
 * `pedidos` é quantos clientes novos a projeção soma no período.
 * Devolve quantos faltariam ARRUMAR além do que já está em jogo.
 */
export function oQueFaltaNoFunil(
  funil: FunilParaMetas,
  pedidos: number,
): { cobre: boolean; faltam: number } {
  const faltam = Math.max(0, pedidos - funil.quantas);
  return { cobre: faltam === 0, faltam };
}
