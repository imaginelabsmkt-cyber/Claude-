import type { ParteDaFolha } from "@/lib/financeiro/folha";

/**
 * Saldo de verdade e previsão.
 *
 * Do documento da Favie, "Por onde começar":
 *
 *   "Saldo de verdade x previsão. Hoje o topo mistura o que já
 *    aconteceu com o que ainda vai acontecer."
 *
 * E está certo. A conta de cima era saldo inicial mais o resultado do
 * mês INTEIRO — incluindo a mensalidade que ninguém pagou ainda e o
 * pró-labore que só sai dia 10 do mês que vem. Dava um "saldo final"
 * que não era saldo de nada: era um palpite escrito com a mesma letra
 * de um extrato.
 *
 * Agora são dois números com nomes diferentes:
 *
 *   SALDO HOJE  = saldo inicial + o que entrou de verdade
 *                               − o que saiu de verdade
 *   PREVISÃO    = saldo hoje + tudo que ainda está pendente
 *
 * "De verdade" é a caixinha marcada. Nada mais.
 */

export interface SaldoDoMes {
  /** O que existe agora: só lançamento com baixa. */
  hoje: number;
  /** Onde o mês termina se tudo for pago. */
  previsao: number;
  /** Receita do mês ainda não recebida. */
  faltaReceber: number;
  /** Despesa do mês ainda não paga. */
  faltaPagar: number;
}

export function saldoDoMes(
  saldoInicial: number,
  entrou: ParteDaFolha,
  saiu: ParteDaFolha,
): SaldoDoMes {
  const faltaReceber = entrou.total - entrou.pago;
  const faltaPagar = saiu.total - saiu.pago;
  const hoje = saldoInicial + entrou.pago - saiu.pago;
  return {
    hoje,
    previsao: hoje + faltaReceber - faltaPagar,
    faltaReceber,
    faltaPagar,
  };
}
