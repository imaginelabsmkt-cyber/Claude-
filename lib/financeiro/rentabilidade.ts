/**
 * Rentabilidade por cliente.
 *
 * Responde "esse cliente se paga?" separando duas coisas que costumam
 * ser confundidas:
 *
 *   CUSTO DIRETO  — despesa lançada COM aquele cliente: o freela que
 *                   editou os vídeos dele, o tráfego pago da campanha
 *                   dele. Sai direto de `financial_entries.client_id`.
 *
 *   CUSTO INDIRETO — o que a agência gasta para existir: pró-labore,
 *                   ferramentas, contador. Não é de ninguém em
 *                   particular.
 *
 * A margem direta é fato. O resultado com rateio é uma ESTIMATIVA: ele
 * divide o custo indireto entre os clientes na proporção da receita de
 * cada um — quem fatura mais absorve mais. É a forma mais comum de
 * ratear, e a única honesta sem apontar horas trabalhadas.
 *
 * Funções puras, cobertas por testes.
 */

import { arredondar, dividirSeguro, somar } from "@/lib/financeiro/calculo";
import type { FinancialEntry } from "@/types";

/** O resultado de um cliente no período. */
export interface RentabilidadeCliente {
  clienteId: string;
  nome: string;
  receita: number;
  /** Despesa lançada com este cliente. */
  custoDireto: number;
  /** receita − custoDireto. */
  margemDireta: number;
  /** margemDireta / receita. */
  margemPercentual: number;
  /** Fatia do custo indireto atribuída a este cliente (estimativa). */
  rateio: number;
  /** margemDireta − rateio. Negativo = o cliente não cobre o próprio peso. */
  resultadoComRateio: number;
  /** Quanto este cliente representa da receita total. */
  pesoNaReceita: number;
}

export interface Rentabilidade {
  clientes: RentabilidadeCliente[];
  receitaTotal: number;
  custoDiretoTotal: number;
  /** Despesa sem cliente: pró-labore, ferramentas, impostos. */
  custoIndireto: number;
  resultado: number;
}

/**
 * Calcula a rentabilidade a partir dos lançamentos de um período.
 *
 * Considera apenas o que foi PAGO — receita prometida não paga cliente
 * nenhum, e despesa não paga ainda não saiu do caixa.
 */
export function calcularRentabilidade(
  lancamentos: FinancialEntry[],
  nomes: Map<string, string>,
): Rentabilidade {
  const pagos = lancamentos.filter((l) => l.status === "Pago");

  const receitas = pagos.filter((l) => l.kind === "Receita");
  const despesas = pagos.filter((l) => l.kind === "Despesa");

  const receitaTotal = somar(receitas.map((l) => Number(l.amount)));
  const custoDiretoTotal = somar(
    despesas.filter((l) => l.client_id).map((l) => Number(l.amount)),
  );
  const custoIndireto = somar(
    despesas.filter((l) => !l.client_id).map((l) => Number(l.amount)),
  );

  // Todo cliente que aparece de algum lado entra na conta.
  const ids = new Set<string>();
  for (const l of [...receitas, ...despesas]) {
    if (l.client_id) ids.add(l.client_id);
  }

  const clientes: RentabilidadeCliente[] = [...ids].map((id) => {
    const receita = somar(
      receitas.filter((l) => l.client_id === id).map((l) => Number(l.amount)),
    );
    const custoDireto = somar(
      despesas.filter((l) => l.client_id === id).map((l) => Number(l.amount)),
    );
    const margemDireta = arredondar(receita - custoDireto);
    const peso = dividirSeguro(receita, receitaTotal);
    const rateio = arredondar(custoIndireto * peso);

    return {
      clienteId: id,
      nome: nomes.get(id) ?? "Cliente removido",
      receita,
      custoDireto,
      margemDireta,
      margemPercentual: dividirSeguro(margemDireta, receita),
      rateio,
      resultadoComRateio: arredondar(margemDireta - rateio),
      pesoNaReceita: peso,
    };
  });

  // Do que mais rende para o que menos rende.
  clientes.sort((a, b) => b.resultadoComRateio - a.resultadoComRateio);

  return {
    clientes,
    receitaTotal,
    custoDiretoTotal,
    custoIndireto,
    resultado: arredondar(receitaTotal - custoDiretoTotal - custoIndireto),
  };
}

/**
 * Receita que não tem cliente apontado (projeto avulso lançado solto).
 * Ela entra no total mas não aparece em cliente nenhum — vale avisar,
 * porque distorce o rateio.
 */
export function receitaSemCliente(lancamentos: FinancialEntry[]): number {
  return somar(
    lancamentos
      .filter((l) => l.kind === "Receita" && l.status === "Pago" && !l.client_id)
      .map((l) => Number(l.amount)),
  );
}
