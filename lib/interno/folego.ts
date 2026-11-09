/**
 * =============================================================
 * FÔLEGO DE CAIXA
 * =============================================================
 * Quanto tempo o dinheiro em caixa aguenta, no ritmo dos últimos
 * meses.
 *
 * É o número que as referências de painel financeiro colocam no topo,
 * antes de qualquer outro: não adianta saber que entraram R$ 14 mil
 * se não dá para saber se isso dura. "Sobrou R$ 11.923" não é uma
 * decisão; "o caixa cobre a operação até junho" é.
 *
 * A conta é deliberadamente burra: média do resultado dos últimos
 * meses fechados, e caixa dividido por ela. Nada de projeção
 * sofisticada, porque uma agência de duas pessoas não tem série
 * histórica para isso, e um número elaborado daria uma falsa precisão
 * pior que a conta simples.
 * =============================================================
 */

import { arredondar } from "@/lib/financeiro/calculo";
import { deslocarMes } from "@/lib/financeiro/meses";

/** Quantos meses de trás olhar. Três pega a tendência sem virar média de ano. */
export const MESES_DE_BASE = 3;

export interface Folego {
  /** Média do resultado dos últimos meses. Negativa = queimando caixa. */
  mediaMensal: number;
  /**
   * Em quantos meses o caixa acaba nesse ritmo.
   * Null quando a média é zero ou positiva: aí não acaba.
   */
  meses: number | null;
  /** Último mês coberto ("YYYY-MM"). Null quando não acaba. */
  ate: string | null;
}

/**
 * Calcula o fôlego a partir dos resultados mensais já fechados.
 *
 * `resultados` vem do mais antigo para o mais recente. Meses sem
 * movimento nenhum ficam de fora da média: um mês zerado costuma ser
 * mês não lançado, não mês sem gasto, e incluí-lo faria a média
 * parecer melhor do que a realidade.
 */
export function calcularFolego(
  caixa: number,
  resultados: { mes: string; resultado: number; movimento: number }[],
  mesAtual: string,
): Folego {
  const comMovimento = resultados.filter((r) => r.movimento > 0);
  const base = comMovimento.slice(-MESES_DE_BASE);

  if (base.length === 0) {
    return { mediaMensal: 0, meses: null, ate: null };
  }

  const media = arredondar(
    base.reduce((t, r) => t + r.resultado, 0) / base.length,
  );

  if (media >= 0 || caixa <= 0) {
    return { mediaMensal: media, meses: null, ate: null };
  }

  const meses = Math.floor(caixa / Math.abs(media));
  return {
    mediaMensal: media,
    meses,
    ate: meses > 0 ? deslocarMes(mesAtual, meses) : mesAtual,
  };
}
