import { somarMeses, mesesEntre } from "@/lib/metas/projecao";

/**
 * O custo fixo de cada mês futuro, a partir das contas fixas.
 *
 * Esta função é o "tudo se integre" do pedido da Fran, no ponto em
 * que ele mais vale.
 *
 * Na planilha da Vitória, o custo fixo eram DOIS NÚMEROS E UMA DATA,
 * digitados à mão:
 *
 *   custo fixo até fev/27        R$ 16.222,02
 *   custo fixo a partir de mar/27 R$ 14.055,32
 *   =IF(mês < março, o primeiro, o segundo)
 *
 * Os dois existem porque a mentoria Ultralize acaba em fevereiro. E
 * os dois envelhecem na primeira conta fixa que entrar ou sair, aí
 * a projeção inteira mente, e ninguém percebe, porque o número tem
 * cara de certo.
 *
 * O sistema já guarda o mês de início e o de fim de cada conta fixa.
 * Então a soma de cada mês sai daqui, calculada. Quando a Fran
 * cancelar uma assinatura em abril, a projeção muda sozinha.
 */

export interface ContaFixa {
  kind: string;
  amount: number;
  active: boolean;
  /** "YYYY-MM" */
  start_month: string;
  /** "YYYY-MM" ou null, quando não tem fim. */
  end_month: string | null;
}

/** A conta fixa está valendo neste mês? */
export function valeNoMes(c: ContaFixa, mes: string): boolean {
  if (!c.active) return false;
  if (mesesEntre(c.start_month, mes) < 0) return false;
  if (c.end_month && mesesEntre(c.end_month, mes) > 0) return false;
  return true;
}

/**
 * Soma as DESPESAS fixas de um mês.
 *
 * Só despesa: a receita recorrente é o faturamento, e entra na
 * projeção pelo outro lado. Somar as duas aqui daria um "custo fixo"
 * negativo, que não quer dizer nada.
 */
export function custoFixoDoMes(contas: ContaFixa[], mes: string): number {
  return contas
    .filter((c) => c.kind === "Despesa" && valeNoMes(c, mes))
    .reduce((t, c) => t + c.amount, 0);
}

/**
 * O mapa de "YYYY-MM" para custo fixo, de `primeiroMes` por
 * `quantosMeses` meses.
 */
export function custoFixoPorMes(
  contas: ContaFixa[],
  primeiroMes: string,
  quantosMeses: number,
): Record<string, number> {
  const mapa: Record<string, number> = {};
  for (let i = 0; i < quantosMeses; i++) {
    const mes = somarMeses(primeiroMes, i);
    mapa[mes] = custoFixoDoMes(contas, mes);
  }
  return mapa;
}

/**
 * As contas fixas que ACABAM dentro da janela da projeção.
 *
 * Vale escrever na tela: "a mentoria Ultralize sai em fevereiro, e
 * com ela R$ 2.166,70 por mês" é a explicação de um degrau no meio
 * da tabela que, sem isso, parece erro de conta.
 */
export function oQueAcabaNaJanela(
  contas: ContaFixa[],
  primeiroMes: string,
  quantosMeses: number,
): { descricao: string; mes: string; valor: number }[] {
  const ultimo = somarMeses(primeiroMes, quantosMeses - 1);
  return contas
    .filter(
      (c) =>
        c.active &&
        c.kind === "Despesa" &&
        c.end_month != null &&
        mesesEntre(primeiroMes, c.end_month) >= -1 &&
        mesesEntre(c.end_month, ultimo) >= 0,
    )
    .map((c) => ({
      descricao: (c as ContaFixa & { description?: string }).description ?? "",
      mes: c.end_month!,
      valor: c.amount,
    }))
    .sort((a, b) => (a.mes < b.mes ? -1 : 1));
}
