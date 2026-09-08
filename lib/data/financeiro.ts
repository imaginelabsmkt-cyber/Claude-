import { createClient } from "@/lib/supabase/server";
import {
  agruparPorCategoria,
  agruparPorCliente,
  encadearMeses,
  resumirMes,
  variacao,
  type ResumoMes,
  type TotalCategoria,
  type TotalCliente,
} from "@/lib/financeiro/calculo";
import { intervaloMeses, mesAnterior, mesesDoAno } from "@/lib/financeiro/meses";
import { escaparLike } from "@/lib/utils";
import type {
  Client,
  FinancialCategory,
  FinancialEntry,
  FinancialEntryWithRelations,
  FinancialKind,
  FinancialRecurrenceWithRelations,
  FinancialSettings,
  FinancialStatus,
} from "@/types";

/** Configuração padrão usada enquanto a linha única não existe no banco. */
const CONFIG_PADRAO: FinancialSettings = {
  id: true,
  opening_balance: 0,
  opening_month: "2026-04",
  updated_at: new Date().toISOString(),
};

/** Lê a configuração do módulo (saldo inicial e mês de partida da série). */
export async function obterConfiguracaoFinanceira(): Promise<FinancialSettings> {
  const supabase = createClient();
  const { data } = await supabase
    .from("financial_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  if (!data) return CONFIG_PADRAO;
  return { ...data, opening_balance: Number(data.opening_balance) };
}

/** Lista categorias (opcionalmente de um tipo), na ordem de exibição. */
export async function listarCategorias(
  kind?: FinancialKind,
): Promise<FinancialCategory[]> {
  const supabase = createClient();
  let query = supabase
    .from("financial_categories")
    .select("*")
    .order("kind", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (kind) query = query.eq("kind", kind);
  const { data } = await query;
  return data ?? [];
}

/** Índice de categorias por id, com os metadados usados nos agrupamentos. */
export function indexarCategorias(
  categorias: FinancialCategory[],
): Map<string, { nome: string; kind: FinancialKind; ordem: number }> {
  return new Map(
    categorias.map((c) => [c.id, { nome: c.name, kind: c.kind, ordem: c.sort_order }]),
  );
}

/** Clientes ativos e inativos (id + nome + cor), para selects e rótulos. */
export async function listarClientesFinanceiro(): Promise<
  Pick<Client, "id" | "name" | "color" | "active">[]
> {
  const supabase = createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name, color, active")
    .order("name", { ascending: true });
  return data ?? [];
}

export interface FiltrosLancamentos {
  /** Mês exato de competência ("YYYY-MM"). */
  mes?: string;
  /** Intervalo de competência (usado no resumo anual). */
  mesInicio?: string;
  mesFim?: string;
  kind?: FinancialKind;
  status?: FinancialStatus;
  categoriaId?: string;
  clienteId?: string;
  /** Busca na descrição. */
  q?: string;
}

const SELECT_COM_RELACOES = `
  *,
  category:financial_categories(*),
  client:clients(*)
`;

/** Converte os numéricos do Postgres (que chegam como string) para number. */
function normalizarValores<T extends { amount: number | string }>(linha: T): T {
  return { ...linha, amount: Number(linha.amount) };
}

/**
 * Lista lançamentos com relacionamentos resolvidos, aplicando os filtros
 * informados. Ordena por vencimento/descrição para leitura natural.
 */
export async function listarLancamentos(
  filtros: FiltrosLancamentos = {},
): Promise<FinancialEntryWithRelations[]> {
  const supabase = createClient();

  let query = supabase
    .from("financial_entries")
    .select(SELECT_COM_RELACOES)
    .order("reference_month", { ascending: true })
    .order("kind", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("description", { ascending: true });

  if (filtros.mes) query = query.eq("reference_month", filtros.mes);
  if (filtros.mesInicio) query = query.gte("reference_month", filtros.mesInicio);
  if (filtros.mesFim) query = query.lte("reference_month", filtros.mesFim);
  if (filtros.kind) query = query.eq("kind", filtros.kind);
  if (filtros.status) query = query.eq("status", filtros.status);
  if (filtros.categoriaId) query = query.eq("category_id", filtros.categoriaId);
  if (filtros.clienteId) query = query.eq("client_id", filtros.clienteId);
  if (filtros.q?.trim()) {
    query = query.ilike("description", `%${escaparLike(filtros.q.trim())}%`);
  }

  const { data } = await query;
  return ((data ?? []) as unknown as FinancialEntryWithRelations[]).map(
    normalizarValores,
  );
}

/** Obtém um lançamento pelo id (ou null). */
export async function obterLancamento(
  id: string,
): Promise<FinancialEntryWithRelations | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("financial_entries")
    .select(SELECT_COM_RELACOES)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return normalizarValores(data as unknown as FinancialEntryWithRelations);
}

/**
 * Lançamentos "crus" de um intervalo — usados só para cálculo (sem joins,
 * para não trazer peso desnecessário no encadeamento de saldo).
 */
async function lancamentosDoIntervalo(
  mesInicio: string,
  mesFim: string,
): Promise<FinancialEntry[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("financial_entries")
    .select(
      "id, reference_month, kind, category_id, client_id, description, amount, status, due_date, paid_date, payment_method, notes, recurrence_id, created_at, updated_at",
    )
    .gte("reference_month", mesInicio)
    .lte("reference_month", mesFim);
  return ((data ?? []) as FinancialEntry[]).map(normalizarValores);
}

/**
 * Saldo inicial de um mês: parte do saldo configurado e encadeia todos os
 * meses anteriores (o `=Abril!B80` da planilha, feito em cadeia).
 */
export async function calcularSaldoInicial(mes: string): Promise<number> {
  const config = await obterConfiguracaoFinanceira();
  if (mes <= config.opening_month) return config.opening_balance;

  const meses = intervaloMeses(config.opening_month, mesAnterior(mes));
  if (meses.length === 0) return config.opening_balance;

  const lancamentos = await lancamentosDoIntervalo(
    config.opening_month,
    mesAnterior(mes),
  );
  const serie = encadearMeses(meses, lancamentos, config.opening_balance);
  return serie[serie.length - 1]?.saldoFinal ?? config.opening_balance;
}

/** Painel consolidado de um mês. */
export interface PainelMes {
  mes: string;
  resumo: ResumoMes;
  /** Mesmo resumo do mês anterior, para comparação. */
  anterior: ResumoMes | null;
  /** Variação da receita realizada contra o mês anterior (null = sem base). */
  variacaoReceita: number | null;
  receitasPorCategoria: TotalCategoria[];
  despesasPorCategoria: TotalCategoria[];
  porCliente: TotalCliente[];
  lancamentos: FinancialEntryWithRelations[];
  /** Pendências do mês, das mais antigas para as mais recentes. */
  aReceber: FinancialEntryWithRelations[];
  aPagar: FinancialEntryWithRelations[];
}

/**
 * Monta o painel do mês: totais, quebra por categoria, ranking de clientes
 * e as pendências em aberto.
 */
export async function obterPainelMes(mes: string): Promise<PainelMes> {
  const [config, categorias, clientes] = await Promise.all([
    obterConfiguracaoFinanceira(),
    listarCategorias(),
    listarClientesFinanceiro(),
  ]);

  const inicio = config.opening_month < mes ? config.opening_month : mes;
  const [brutos, lancamentos] = await Promise.all([
    lancamentosDoIntervalo(inicio, mes),
    listarLancamentos({ mes }),
  ]);

  const meses = intervaloMeses(inicio, mes);
  const serie = encadearMeses(meses, brutos, config.opening_balance);
  const resumo = serie[serie.length - 1] ?? resumirMes(mes, [], config.opening_balance);
  const anterior = serie.length > 1 ? serie[serie.length - 2] : null;

  const meta = indexarCategorias(categorias);
  const nomesClientes = new Map(clientes.map((c) => [c.id, c.name]));
  const doMes = brutos.filter((l) => l.reference_month === mes);

  const porCategoria = agruparPorCategoria(doMes, meta);
  const ordenarPorVencimento = (a: FinancialEntry, b: FinancialEntry) =>
    (a.due_date ?? "9999-12-31").localeCompare(b.due_date ?? "9999-12-31");

  return {
    mes,
    resumo,
    anterior,
    variacaoReceita: anterior ? variacao(resumo.receitas, anterior.receitas) : null,
    receitasPorCategoria: porCategoria.filter((c) => c.kind === "Receita"),
    despesasPorCategoria: porCategoria.filter((c) => c.kind === "Despesa"),
    porCliente: agruparPorCliente(doMes, nomesClientes),
    lancamentos,
    aReceber: lancamentos
      .filter((l) => l.kind === "Receita" && l.status === "Pendente")
      .sort(ordenarPorVencimento),
    aPagar: lancamentos
      .filter((l) => l.kind === "Despesa" && l.status === "Pendente")
      .sort(ordenarPorVencimento),
  };
}

/** Uma linha do resumo anual: a categoria e seus valores mês a mês. */
export interface LinhaResumoAnual {
  categoriaId: string;
  nome: string;
  kind: FinancialKind;
  /** Valor realizado por mês, na mesma ordem de `meses`. */
  porMes: number[];
  /** Valor previsto (realizado + pendente) por mês. */
  previstoPorMes: number[];
  total: number;
  totalPrevisto: number;
}

/** Consolidação anual (a aba "Resumo Anual" da planilha). */
export interface ResumoAnual {
  ano: number;
  meses: string[];
  serie: ResumoMes[];
  receitas: LinhaResumoAnual[];
  despesas: LinhaResumoAnual[];
  totais: {
    receitas: number;
    despesas: number;
    resultado: number;
    saldoFinal: number;
    margem: number;
  };
}

/**
 * Consolida um ano inteiro: uma coluna por mês, uma linha por categoria,
 * mais a série de saldos encadeados.
 */
export async function obterResumoAnual(ano: number): Promise<ResumoAnual> {
  const meses = mesesDoAno(ano);
  const primeiro = meses[0];
  const ultimo = meses[meses.length - 1];

  const [config, categorias] = await Promise.all([
    obterConfiguracaoFinanceira(),
    listarCategorias(),
  ]);

  const inicio = config.opening_month < primeiro ? config.opening_month : primeiro;
  const brutos = await lancamentosDoIntervalo(inicio, ultimo);

  // Encadeia desde o início da série para que o saldo de janeiro do ano
  // exibido já traga o acumulado dos meses anteriores.
  const serieCompleta = encadearMeses(
    intervaloMeses(inicio, ultimo),
    brutos,
    config.opening_balance,
  );
  const serie = serieCompleta.filter((r) => meses.includes(r.mes));

  const meta = indexarCategorias(categorias);
  const linhas = new Map<string, LinhaResumoAnual>();

  for (const categoria of categorias) {
    linhas.set(categoria.id, {
      categoriaId: categoria.id,
      nome: categoria.name,
      kind: categoria.kind,
      porMes: meses.map(() => 0),
      previstoPorMes: meses.map(() => 0),
      total: 0,
      totalPrevisto: 0,
    });
  }

  for (const lancamento of brutos) {
    const coluna = meses.indexOf(lancamento.reference_month);
    if (coluna < 0) continue;

    const info = meta.get(lancamento.category_id);
    let linha = linhas.get(lancamento.category_id);
    if (!linha) {
      linha = {
        categoriaId: lancamento.category_id,
        nome: info?.nome ?? "Sem categoria",
        kind: lancamento.kind,
        porMes: meses.map(() => 0),
        previstoPorMes: meses.map(() => 0),
        total: 0,
        totalPrevisto: 0,
      };
      linhas.set(lancamento.category_id, linha);
    }

    const valor = Number(lancamento.amount) || 0;
    if (lancamento.status === "Pago") {
      linha.porMes[coluna] += valor;
      linha.total += valor;
    }
    linha.previstoPorMes[coluna] += valor;
    linha.totalPrevisto += valor;
  }

  // Categorias sem nenhum movimento no ano não poluem a tabela.
  const usadas = [...linhas.values()].filter((l) => l.totalPrevisto !== 0);
  const ordenar = (a: LinhaResumoAnual, b: LinhaResumoAnual) => {
    const ordemA = meta.get(a.categoriaId)?.ordem ?? 999;
    const ordemB = meta.get(b.categoriaId)?.ordem ?? 999;
    return ordemA - ordemB || a.nome.localeCompare(b.nome, "pt-BR");
  };

  const totalReceitas = serie.reduce((t, r) => t + r.receitas, 0);
  const totalDespesas = serie.reduce((t, r) => t + r.despesas, 0);
  const resultado = totalReceitas - totalDespesas;

  return {
    ano,
    meses,
    serie,
    receitas: usadas.filter((l) => l.kind === "Receita").sort(ordenar),
    despesas: usadas.filter((l) => l.kind === "Despesa").sort(ordenar),
    totais: {
      receitas: totalReceitas,
      despesas: totalDespesas,
      resultado,
      saldoFinal: serie[serie.length - 1]?.saldoFinal ?? config.opening_balance,
      margem: totalReceitas ? resultado / totalReceitas : 0,
    },
  };
}

/** Lista as recorrências cadastradas, com categoria e cliente resolvidos. */
export async function listarRecorrencias(): Promise<
  FinancialRecurrenceWithRelations[]
> {
  const supabase = createClient();
  const { data } = await supabase
    .from("financial_recurrences")
    .select("*, category:financial_categories(*), client:clients(*)")
    .order("active", { ascending: false })
    .order("kind", { ascending: true })
    .order("description", { ascending: true });
  return ((data ?? []) as unknown as FinancialRecurrenceWithRelations[]).map(
    normalizarValores,
  );
}

/** Obtém uma recorrência pelo id (ou null). */
export async function obterRecorrencia(
  id: string,
): Promise<FinancialRecurrenceWithRelations | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("financial_recurrences")
    .select("*, category:financial_categories(*), client:clients(*)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return normalizarValores(data as unknown as FinancialRecurrenceWithRelations);
}

/**
 * Quantas recorrências ainda NÃO foram geradas para o mês — alimenta o
 * aviso do botão "Gerar lançamentos do mês".
 */
export async function contarRecorrenciasPendentes(mes: string): Promise<number> {
  const supabase = createClient();
  const [{ data: recorrencias }, { data: geradas }] = await Promise.all([
    supabase
      .from("financial_recurrences")
      .select("id, start_month, end_month")
      .eq("active", true),
    supabase
      .from("financial_entries")
      .select("recurrence_id")
      .eq("reference_month", mes)
      .not("recurrence_id", "is", null),
  ]);

  const jaGeradas = new Set((geradas ?? []).map((l) => l.recurrence_id));
  return (recorrencias ?? []).filter(
    (r) =>
      r.start_month <= mes &&
      (!r.end_month || r.end_month >= mes) &&
      !jaGeradas.has(r.id),
  ).length;
}
