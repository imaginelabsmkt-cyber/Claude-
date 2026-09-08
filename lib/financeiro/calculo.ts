/**
 * Regras de cálculo do fluxo de caixa.
 *
 * Funções PURAS (sem banco, sem React) — são a tradução das fórmulas da
 * planilha e por isso ficam isoladas e cobertas por testes:
 *
 *   Realizado  = lançamentos com status "Pago"      (dinheiro que andou)
 *   Previsto   = "Pago" + "Pendente"                (se tudo se confirmar)
 *   Resultado  = receitas - despesas
 *   Saldo final do mês = saldo inicial + resultado
 *   Saldo inicial do mês seguinte = saldo final do mês anterior
 *   Margem líquida = resultado / receitas
 *
 * O encadeamento do saldo usa o REALIZADO, porque é o que de fato existe
 * em caixa; o previsto é exibido em paralelo como projeção.
 */

import type { FinancialEntry, FinancialKind } from "@/types";

/** Arredonda para centavos, evitando o acúmulo de erro de ponto flutuante. */
export function arredondar(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/** Soma valores monetários com arredondamento a cada passo. */
export function somar(valores: number[]): number {
  return arredondar(valores.reduce((total, v) => total + (Number(v) || 0), 0));
}

/** Resultado consolidado de um mês. */
export interface ResumoMes {
  mes: string;
  /** Caixa no início do mês (= saldo final do mês anterior). */
  saldoInicial: number;

  // --- Realizado (somente "Pago") ---
  receitas: number;
  despesas: number;
  resultado: number;
  saldoFinal: number;
  /** resultado / receitas (0 quando não há receita). */
  margem: number;

  // --- Pendências ---
  aReceber: number;
  aPagar: number;

  // --- Previsto (realizado + pendente) ---
  receitasPrevistas: number;
  despesasPrevistas: number;
  resultadoPrevisto: number;
  saldoFinalPrevisto: number;
  margemPrevista: number;

  /** Quantidade de lançamentos do mês (realizados + pendentes). */
  quantidade: number;
}

function totalizar(
  lancamentos: FinancialEntry[],
  kind: FinancialKind,
  pagos: boolean,
): number {
  return somar(
    lancamentos
      .filter(
        (l) => l.kind === kind && (pagos ? l.status === "Pago" : l.status === "Pendente"),
      )
      .map((l) => Number(l.amount)),
  );
}

/** Divide com proteção contra zero (equivalente ao IFERROR da planilha). */
export function dividirSeguro(numerador: number, denominador: number): number {
  if (!denominador) return 0;
  const r = numerador / denominador;
  return Number.isFinite(r) ? r : 0;
}

/**
 * Consolida um mês a partir dos seus lançamentos e do saldo inicial.
 */
export function resumirMes(
  mes: string,
  lancamentos: FinancialEntry[],
  saldoInicial: number,
): ResumoMes {
  const doMes = lancamentos.filter((l) => l.reference_month === mes);

  const receitas = totalizar(doMes, "Receita", true);
  const despesas = totalizar(doMes, "Despesa", true);
  const aReceber = totalizar(doMes, "Receita", false);
  const aPagar = totalizar(doMes, "Despesa", false);

  const resultado = arredondar(receitas - despesas);
  const saldoFinal = arredondar(saldoInicial + resultado);

  const receitasPrevistas = arredondar(receitas + aReceber);
  const despesasPrevistas = arredondar(despesas + aPagar);
  const resultadoPrevisto = arredondar(receitasPrevistas - despesasPrevistas);

  return {
    mes,
    saldoInicial: arredondar(saldoInicial),
    receitas,
    despesas,
    resultado,
    saldoFinal,
    margem: dividirSeguro(resultado, receitas),
    aReceber,
    aPagar,
    receitasPrevistas,
    despesasPrevistas,
    resultadoPrevisto,
    saldoFinalPrevisto: arredondar(saldoInicial + resultadoPrevisto),
    margemPrevista: dividirSeguro(resultadoPrevisto, receitasPrevistas),
    quantidade: doMes.length,
  };
}

/**
 * Consolida uma sequência de meses encadeando o saldo: o saldo final de um
 * mês é o saldo inicial do seguinte (a fórmula `=Abril!B80` da planilha).
 */
export function encadearMeses(
  meses: string[],
  lancamentos: FinancialEntry[],
  saldoInicial: number,
): ResumoMes[] {
  let saldo = saldoInicial;
  return meses.map((mes) => {
    const resumo = resumirMes(mes, lancamentos, saldo);
    saldo = resumo.saldoFinal;
    return resumo;
  });
}

/** Totais de uma categoria dentro de um recorte de lançamentos. */
export interface TotalCategoria {
  categoriaId: string;
  nome: string;
  kind: FinancialKind;
  /** Somente "Pago". */
  realizado: number;
  /** Somente "Pendente". */
  pendente: number;
  /** realizado + pendente. */
  previsto: number;
  quantidade: number;
}

/**
 * Agrupa lançamentos por categoria, preservando a ordem informada em
 * `ordem` (os ids na sequência de exibição das categorias).
 */
export function agruparPorCategoria(
  lancamentos: FinancialEntry[],
  nomes: Map<string, { nome: string; kind: FinancialKind; ordem: number }>,
): TotalCategoria[] {
  const mapa = new Map<string, TotalCategoria>();

  for (const l of lancamentos) {
    const meta = nomes.get(l.category_id);
    const atual = mapa.get(l.category_id) ?? {
      categoriaId: l.category_id,
      nome: meta?.nome ?? "Sem categoria",
      kind: meta?.kind ?? l.kind,
      realizado: 0,
      pendente: 0,
      previsto: 0,
      quantidade: 0,
    };
    const valor = Number(l.amount) || 0;
    if (l.status === "Pago") atual.realizado = arredondar(atual.realizado + valor);
    else atual.pendente = arredondar(atual.pendente + valor);
    atual.previsto = arredondar(atual.realizado + atual.pendente);
    atual.quantidade += 1;
    mapa.set(l.category_id, atual);
  }

  return [...mapa.values()].sort((a, b) => {
    const ordemA = nomes.get(a.categoriaId)?.ordem ?? 999;
    const ordemB = nomes.get(b.categoriaId)?.ordem ?? 999;
    if (ordemA !== ordemB) return ordemA - ordemB;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

/** Total por cliente (usado no ranking de faturamento). */
export interface TotalCliente {
  clienteId: string | null;
  nome: string;
  realizado: number;
  pendente: number;
  total: number;
}

/** Agrupa receitas por cliente, do maior para o menor faturamento. */
export function agruparPorCliente(
  lancamentos: FinancialEntry[],
  nomes: Map<string, string>,
): TotalCliente[] {
  const mapa = new Map<string, TotalCliente>();

  for (const l of lancamentos) {
    if (l.kind !== "Receita") continue;
    const chave = l.client_id ?? "__sem_cliente__";
    const atual = mapa.get(chave) ?? {
      clienteId: l.client_id,
      nome: l.client_id ? (nomes.get(l.client_id) ?? "Cliente removido") : "Sem cliente",
      realizado: 0,
      pendente: 0,
      total: 0,
    };
    const valor = Number(l.amount) || 0;
    if (l.status === "Pago") atual.realizado = arredondar(atual.realizado + valor);
    else atual.pendente = arredondar(atual.pendente + valor);
    atual.total = arredondar(atual.realizado + atual.pendente);
    mapa.set(chave, atual);
  }

  return [...mapa.values()].sort((a, b) => b.total - a.total);
}

/**
 * Variação percentual entre dois valores (ex.: receita do mês vs. anterior).
 * Retorna null quando não há base de comparação.
 */
export function variacao(atual: number, anterior: number): number | null {
  if (!anterior) return null;
  return (atual - anterior) / Math.abs(anterior);
}
