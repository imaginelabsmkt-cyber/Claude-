import { mesesDoAno } from "@/lib/financeiro/meses";

/**
 * O mínimo que o ano precisa saber de cada mês.
 *
 * É um subconjunto de `ResumoMes` de propósito: assim a conta do ano é
 * testável com quatro números por mês, sem montar um resumo inteiro.
 */
export interface MesFaturamento {
  mes: string;
  /** Receita que JÁ entrou (lançamento baixado). */
  receitas: number;
  /** Despesa que JÁ saiu. */
  despesas: number;
  /** Receita entrada + ainda a receber. */
  receitasPrevistas: number;
  /** Despesa saída + ainda a pagar. */
  despesasPrevistas: number;
}

/** Um mês dentro do gráfico do ano. */
export interface BarraDoAno {
  mes: string;
  entrou: number;
  saiu: number;
  /** O mês já aconteceu (tem algum valor lançado). */
  comMovimento: boolean;
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

  const meses = mesesDoAno(ano).map((mes) => {
    const m = porMes.get(mes);
    return {
      mes,
      receitas: m?.receitas ?? 0,
      despesas: m?.despesas ?? 0,
      receitasPrevistas: m?.receitasPrevistas ?? 0,
      despesasPrevistas: m?.despesasPrevistas ?? 0,
    };
  });

  const soma = (f: (m: (typeof meses)[number]) => number) =>
    meses.reduce((t, m) => t + f(m), 0);

  const recebido = soma((m) => m.receitas);
  const previsto = soma((m) => m.receitasPrevistas);
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
    aReceber: previsto - recebido,
    previsto,
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
  };
}

/** Passos "redondos" aceitos para o teto do eixo, por década. */
const PASSOS = [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10];

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
