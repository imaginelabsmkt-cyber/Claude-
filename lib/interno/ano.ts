import { mesesDoAno } from "@/lib/financeiro/meses";

/**
 * O mínimo que o ano precisa saber de cada mês.
 *
 * É um subconjunto de `ResumoMes` de propósito: assim a conta do ano é
 * testável com quatro números por mês, sem montar um resumo inteiro.
 */
export interface MesFaturamento {
  mes: string;
  /** Tudo que foi faturado no mês, caído ou não — como na planilha. */
  receitas: number;
  /** Tudo que foi lançado como despesa no mês. */
  despesas: number;
  /** Do faturado, o que já caiu na conta. */
  recebido?: number;
  /** Das despesas, o que já saiu. */
  pago?: number;
  /** Caixa no fim do mês, já encadeado com os meses anteriores. */
  saldoFinal: number;
}

/** Um mês dentro do gráfico do ano. */
export interface BarraDoAno {
  mes: string;
  entrou: number;
  saiu: number;
  /** O mês já aconteceu (tem algum valor lançado). */
  comMovimento: boolean;
}

/** Um mês na linha do caixa. Só meses que existem de verdade. */
export interface PontoDeCaixa {
  mes: string;
  saldo: number;
}

/** Os limites e as marcas do eixo vertical de um gráfico. */
export interface EscalaVertical {
  min: number;
  max: number;
  marcas: number[];
}

/** O que a tela Início mostra sobre o ano inteiro. */
export interface FaturamentoAnual {
  ano: number;
  /** Faturamento do ano: o que já entrou. É o número grande da tela. */
  recebido: number;
  /** O que ainda falta receber dos meses do ano. */
  aReceber: number;
  /** Recebido + a receber: onde o ano fecha se nada mudar. */
  previsto: number;
  /** O que já saiu no ano. */
  pago: number;
  /** Recebido menos pago. */
  resultado: number;
  /** Quantos meses do ano já tiveram faturamento. */
  mesesFaturados: number;
  /** Faturamento médio por mês faturado (0 quando nenhum faturou). */
  mediaMensal: number;
  /** Mês de maior faturamento do ano (null quando nenhum faturou). */
  melhorMes: { mes: string; valor: number } | null;
  /** Doze barras, uma por mês, na ordem de janeiro a dezembro. */
  barras: BarraDoAno[];
  /**
   * O caixa no fim de cada mês que REALMENTE existe na série.
   *
   * Não são doze: um mês inventado com saldo zero desenharia uma queda
   * ao chão que nunca aconteceu. Mês sem lançamento simplesmente não
   * tem ponto, e a linha começa onde a empresa começou a lançar.
   */
  pontos: PontoDeCaixa[];
}

/**
 * Fecha o ano a partir dos meses que existem na série.
 *
 * A série pode vir incompleta: se a empresa começou a lançar em abril,
 * não existe janeiro. Os meses que faltam entram como zero em vez de
 * sumir, porque um gráfico de doze colunas em que três faltam engana
 * mais do que três colunas vazias.
 */
export function faturamentoAnual(
  ano: number,
  serie: MesFaturamento[],
): FaturamentoAnual {
  const porMes = new Map(serie.map((m) => [m.mes, m]));
  const doAno = new Set(mesesDoAno(ano));

  const meses = mesesDoAno(ano).map((mes) => {
    const m = porMes.get(mes);
    return {
      mes,
      receitas: m?.receitas ?? 0,
      despesas: m?.despesas ?? 0,
      recebido: m?.recebido ?? m?.receitas ?? 0,
      pago: m?.pago ?? m?.despesas ?? 0,
    };
  });

  const pontos = serie
    .filter((m) => doAno.has(m.mes))
    .map((m) => ({ mes: m.mes, saldo: m.saldoFinal }))
    .sort((a, b) => a.mes.localeCompare(b.mes));

  const soma = (f: (m: (typeof meses)[number]) => number) =>
    meses.reduce((t, m) => t + f(m), 0);

  // "É o faturamento bruto, não faz sentido já tirar tudo." O número
  // grande do painel é o FATURADO do ano, como o TOTAL RECEITAS da
  // planilha. O que já caiu na conta vem à parte.
  const recebido = soma((m) => m.receitas);
  const caiuNaConta = soma((m) => m.recebido ?? m.receitas);
  const pago = soma((m) => m.despesas);

  const faturados = meses.filter((m) => m.receitas > 0);
  const melhor = faturados.reduce<{ mes: string; valor: number } | null>(
    (melhor, m) =>
      melhor === null || m.receitas > melhor.valor
        ? { mes: m.mes, valor: m.receitas }
        : melhor,
    null,
  );

  return {
    ano,
    recebido,
    aReceber: Math.round((recebido - caiuNaConta) * 100) / 100,
    previsto: recebido,
    pago,
    resultado: recebido - pago,
    mesesFaturados: faturados.length,
    mediaMensal: faturados.length > 0 ? recebido / faturados.length : 0,
    melhorMes: melhor,
    barras: meses.map((m) => ({
      mes: m.mes,
      entrou: m.receitas,
      saiu: m.despesas,
      comMovimento: m.receitas > 0 || m.despesas > 0,
    })),
    pontos,
  };
}

/** Passos "redondos" aceitos para o teto do eixo, por década. */
const PASSOS = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10];

/**
 * Teto redondo para o eixo de um gráfico de barras.
 *
 * Sem isso o eixo vira "R$ 13.147,80", que não é referência de nada. Com
 * isso vira "R$ 15.000", que a pessoa usa para ler as barras de olho.
 */
export function tetoDoEixo(valores: number[]): number {
  const maior = Math.max(0, ...valores);
  if (maior === 0) return 0;

  const decada = Math.pow(10, Math.floor(Math.log10(maior)));
  for (const passo of PASSOS) {
    const teto = passo * decada;
    if (teto >= maior) return teto;
  }
  return 10 * decada;
}

/**
 * Marcas do eixo, do zero ao teto. Duas ou três linhas bastam: a quarta
 * já compete com as barras pela atenção.
 */
export function marcasDoEixo(teto: number, quantas = 2): number[] {
  if (teto <= 0) return [0];
  const marcas: number[] = [];
  for (let i = 0; i <= quantas; i += 1) {
    marcas.push((teto / quantas) * i);
  }
  return marcas;
}

/**
 * Limites e marcas do eixo de um gráfico que pode cruzar o zero.
 *
 * O caixa fica negativo, e um eixo que começa no menor valor esconde
 * exatamente isso. Aqui o zero é sempre uma linha desenhada: ou é o
 * piso, ou é a linha do meio, e a diferença entre estar acima e abaixo
 * dela é a informação.
 */
export function escalaDeSaldo(valores: number[]): EscalaVertical {
  const max = tetoDoEixo(valores.filter((v) => v > 0));
  // O `|| 0` troca o -0 que a negação produz por 0. Com -0 o eixo
  // funciona, mas qualquer comparação de igualdade fica estranha.
  const min = -tetoDoEixo(valores.filter((v) => v < 0).map(Math.abs)) || 0;

  if (max === 0 && min === 0) {
    // Tudo zerado: um eixo de altura zero não desenha nada e ainda
    // divide por zero na hora de posicionar o ponto.
    return { min: 0, max: 1, marcas: [0] };
  }

  return {
    min,
    max,
    marcas: min < 0 ? [min, 0, max] : [0, max / 2, max],
  };
}
