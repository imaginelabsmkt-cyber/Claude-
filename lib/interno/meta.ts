import { mesesDoAno } from "@/lib/financeiro/meses";

/** Onde o ano está em relação à meta de faturamento. */
export interface MetaDoAno {
  /** A meta cheia, como a pessoa escreveu. */
  meta: number;
  /** O que já entrou no ano. */
  recebido: number;
  /** Quanto da meta já veio, de 0 a 1 (pode passar de 1). */
  fatia: number;
  /** O que falta para bater a meta (nunca negativo). */
  falta: number;
  /** Quantos meses do ano ainda não terminaram, contando o de hoje. */
  mesesRestantes: number;
  /** Quanto por mês nos meses que restam (0 se não resta nenhum). */
  porMes: number;
  /** Onde a meta estaria se o ano viesse parelho até aqui. */
  esperado: number;
  /** Recebido >= esperado. */
  noRitmo: boolean;
}

/**
 * A meta do ano, lida contra o calendário.
 *
 * Só dizer "faltam R$ 40.000" não ajuda: falta muito em janeiro é uma
 * coisa, em novembro é outra. Por isso aqui vêm juntos o que falta, em
 * quantos meses, e se o ritmo até agora dá ou não dá.
 *
 * O mês de hoje conta como mês que ainda rende: no dia 9 de novembro
 * ainda há novembro inteiro pela frente para fechar contrato.
 */
export function metaDoAno(
  meta: number | null,
  recebido: number,
  ano: number,
  mesDeHoje: string,
): MetaDoAno | null {
  if (meta == null || meta <= 0) return null;

  const meses = mesesDoAno(ano);
  const primeiro = meses[0];
  const ultimo = meses[meses.length - 1];

  // Quantos meses do ano já se foram por inteiro.
  const decorridos =
    mesDeHoje > ultimo
      ? 12
      : mesDeHoje < primeiro
        ? 0
        : Number(mesDeHoje.slice(5, 7)) - 1;

  const mesesRestantes = 12 - decorridos;
  const falta = Math.max(meta - recebido, 0);

  return {
    meta,
    recebido,
    fatia: recebido / meta,
    falta,
    mesesRestantes,
    porMes: mesesRestantes > 0 ? falta / mesesRestantes : 0,
    esperado: (meta / 12) * decorridos,
    noRitmo: recebido >= (meta / 12) * decorridos,
  };
}
