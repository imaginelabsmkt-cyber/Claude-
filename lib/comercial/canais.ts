/**
 * O que cada canal trouxe, e quanto cada canal custou.
 *
 * Esta é a conta que faltava. A tela de Prospecção já dizia quantos
 * leads cada canal trouxe e quantos viraram cliente, e NÃO dizia
 * quanto cada um custou. Sem o custo, "indicação converte 50%" e
 * "tráfego converte 8%" parecem a mesma informação, quando um é de
 * graça e o outro consome R$ 500 por mês.
 *
 * As duas contas, como no protótipo da Vitória:
 *
 *   custo por cliente = investido ÷ clientes fechados
 *   retorno em 12 meses = receita mensal fechada × 12 ÷ investido
 *
 * Funções PURAS, sem banco.
 */

import { arredondar, somar } from "@/lib/financeiro/calculo";
import type { LeadChannel } from "@/types";

/** O mínimo de uma oportunidade para esta conta. */
export interface OportunidadeDoCanal {
  channel: LeadChannel;
  /** Fechou? */
  ganha: boolean;
  /** Mensalidade estimada ou fechada. */
  estimated_monthly: number;
}

/** Um lançamento de investimento. */
export interface InvestimentoDoCanal {
  channel: LeadChannel;
  amount: number;
}

export interface ResultadoDoCanal {
  canal: LeadChannel;
  leads: number;
  fechados: number;
  /** Quantos de cada cem viraram cliente. `null` sem lead nenhum. */
  conversao: number | null;
  investido: number;
  /** Mensalidade somada do que fechou. */
  receitaMensal: number;
  /**
   * Investido ÷ fechados. `null` quando não fechou nada, dividir por
   * zero aqui daria "infinito", e infinito numa tabela é pior do que
   * um traço: parece um número.
   */
  custoPorCliente: number | null;
  /**
   * Receita mensal × 12 ÷ investido. `null` sem investimento: o canal
   * que não custou nada não tem retorno, tem lucro inteiro, e chamar
   * isso de "infinito vezes" não ajuda ninguém a decidir.
   */
  retorno12Meses: number | null;
}

/**
 * Cruza oportunidades e investimentos, canal a canal.
 *
 * Entram os canais que tiveram lead OU investimento: um canal onde
 * entrou dinheiro e não saiu cliente é exatamente o que a tela
 * precisa mostrar, e ele não apareceria se a lista viesse só dos
 * leads.
 */
export function resultadoDosCanais(
  oportunidades: OportunidadeDoCanal[],
  investimentos: InvestimentoDoCanal[],
  canais: LeadChannel[],
): ResultadoDoCanal[] {
  return canais
    .map((canal) => {
      const doCanal = oportunidades.filter((o) => o.channel === canal);
      const ganhas = doCanal.filter((o) => o.ganha);
      const investido = somar(
        investimentos
          .filter((i) => i.channel === canal)
          .map((i) => Number(i.amount) || 0),
      );
      const receitaMensal = somar(
        ganhas.map((o) => Number(o.estimated_monthly) || 0),
      );

      return {
        canal,
        leads: doCanal.length,
        fechados: ganhas.length,
        conversao:
          doCanal.length === 0
            ? null
            : arredondar((ganhas.length / doCanal.length) * 100),
        investido,
        receitaMensal,
        custoPorCliente:
          ganhas.length === 0 ? null : arredondar(investido / ganhas.length),
        retorno12Meses:
          investido === 0
            ? null
            : arredondar((receitaMensal * 12) / investido),
      };
    })
    .filter((r) => r.leads > 0 || r.investido > 0)
    .sort((a, b) => b.fechados - a.fechados || b.receitaMensal - a.receitaMensal);
}

/** Os totais da tabela, para o rodapé e os números do topo. */
export function totaisDosCanais(linhas: ResultadoDoCanal[]) {
  const leads = linhas.reduce((t, l) => t + l.leads, 0);
  const fechados = linhas.reduce((t, l) => t + l.fechados, 0);
  const investido = somar(linhas.map((l) => l.investido));
  const receitaMensal = somar(linhas.map((l) => l.receitaMensal));

  return {
    leads,
    fechados,
    investido,
    receitaMensal,
    conversao: leads === 0 ? null : arredondar((fechados / leads) * 100),
    custoPorCliente:
      fechados === 0 ? null : arredondar(investido / fechados),
    retorno12Meses:
      investido === 0 ? null : arredondar((receitaMensal * 12) / investido),
  };
}
