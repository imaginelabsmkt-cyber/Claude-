"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dataVencimento } from "@/lib/financeiro/meses";
import { paraNumero } from "@/lib/financeiro/valores";
import {
  categoriaFormSchema,
  configuracaoFinanceiraSchema,
  lancamentoFormSchema,
  recorrenciaFormSchema,
  type CategoriaFormValues,
  type ConfiguracaoFinanceiraValues,
  type LancamentoFormValues,
  type RecorrenciaFormValues,
} from "@/lib/validation/financeiro";
import type { FinancialEntryInsert, FinancialStatus } from "@/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** Erros por campo (chave = nome do campo). */
  fieldErrors?: Record<string, string>;
  id?: string;
}

/** Extrai o primeiro erro de cada campo do resultado do Zod. */
function primeirosErros(
  fieldErrors: Record<string, string[] | undefined>,
): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const [campo, mensagens] of Object.entries(fieldErrors)) {
    if (mensagens && mensagens.length > 0) saida[campo] = mensagens[0];
  }
  return saida;
}

/** Converte string vazia em null. */
function limpar(v?: string | null): string | null {
  const t = v?.trim();
  return t ? t : null;
}

/** Revalida todas as telas que leem os mesmos números. */
function revalidarFinanceiro() {
  revalidatePath("/interno/financeiro");
  revalidatePath("/interno/financeiro/lancamentos");
  revalidatePath("/interno/financeiro/fluxo-caixa");
  revalidatePath("/interno/financeiro/resumo-anual");
  revalidatePath("/interno/financeiro/recorrencias");
}

// -------------------------------------------------------------
// Lançamentos
// -------------------------------------------------------------

/**
 * Monta a linha do banco a partir do formulário.
 * Regra: um lançamento "Pago" sem data de pagamento assume o vencimento
 * (ou nada, se também não houver) — evita registro pago sem data.
 */
function normalizarLancamento(values: LancamentoFormValues): FinancialEntryInsert {
  const vencimento = limpar(values.due_date);
  const pagamento = limpar(values.paid_date);
  return {
    reference_month: values.reference_month,
    kind: values.kind,
    category_id: values.category_id,
    client_id: limpar(values.client_id),
    description: values.description.trim(),
    amount: paraNumero(values.amount) ?? 0,
    status: values.status,
    due_date: vencimento,
    paid_date: values.status === "Pago" ? (pagamento ?? vencimento) : null,
    payment_method: limpar(values.payment_method),
    notes: limpar(values.notes),
  };
}

/** Cria um lançamento. */
export async function criarLancamentoAction(
  input: LancamentoFormValues,
): Promise<ActionResult> {
  const parsed = lancamentoFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: primeirosErros(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("financial_entries")
    .insert(normalizarLancamento(parsed.data))
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "Não foi possível salvar o lançamento." };
  }

  revalidarFinanceiro();
  return { ok: true, id: data.id };
}

/** Atualiza um lançamento existente. */
export async function atualizarLancamentoAction(
  id: string,
  input: LancamentoFormValues,
): Promise<ActionResult> {
  const parsed = lancamentoFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: primeirosErros(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("financial_entries")
    .update(normalizarLancamento(parsed.data))
    .eq("id", id);

  if (error) {
    return { ok: false, error: "Não foi possível atualizar o lançamento." };
  }

  revalidarFinanceiro();
  return { ok: true, id };
}

/**
 * Alterna o status entre "Pago" e "Pendente" (o clique de "dar baixa").
 * Ao marcar como pago, registra a data de hoje quando ainda não há uma.
 */
export async function definirStatusLancamentoAction(
  id: string,
  status: FinancialStatus,
): Promise<ActionResult> {
  const supabase = createClient();

  const { data: atual } = await supabase
    .from("financial_entries")
    .select("due_date, paid_date")
    .eq("id", id)
    .maybeSingle();

  const hoje = new Date();
  const hojeISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

  const { error } = await supabase
    .from("financial_entries")
    .update({
      status,
      paid_date: status === "Pago" ? (atual?.paid_date ?? hojeISO) : null,
    })
    .eq("id", id);

  if (error) return { ok: false, error: "Não foi possível atualizar o status." };

  revalidarFinanceiro();
  return { ok: true, id };
}

/** Exclui um lançamento. */
export async function excluirLancamentoAction(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("financial_entries").delete().eq("id", id);
  if (error) return { ok: false, error: "Não foi possível excluir o lançamento." };
  revalidarFinanceiro();
  return { ok: true };
}

/**
 * Duplica os lançamentos de um mês para outro — o atalho de quem repetia
 * a aba do mês anterior na planilha. Os valores vão como "Pendente",
 * porque ainda não aconteceram.
 */
export async function copiarMesAction(
  mesOrigem: string,
  mesDestino: string,
): Promise<ActionResult & { criados?: number }> {
  if (mesOrigem === mesDestino) {
    return { ok: false, error: "Escolha um mês de destino diferente." };
  }

  const supabase = createClient();
  const { data: origem, error } = await supabase
    .from("financial_entries")
    .select("kind, category_id, client_id, description, amount, due_date, payment_method, notes")
    .eq("reference_month", mesOrigem);

  if (error) return { ok: false, error: "Não foi possível ler o mês de origem." };
  if (!origem || origem.length === 0) {
    return { ok: false, error: "O mês de origem não tem lançamentos." };
  }

  const novos: FinancialEntryInsert[] = origem.map((l) => ({
    reference_month: mesDestino,
    kind: l.kind,
    category_id: l.category_id,
    client_id: l.client_id,
    description: l.description,
    amount: Number(l.amount),
    status: "Pendente" as const,
    // Mantém o dia do vencimento, deslocado para o mês de destino.
    due_date: l.due_date ? dataVencimento(mesDestino, Number(l.due_date.slice(8, 10))) : null,
    paid_date: null,
    payment_method: l.payment_method,
    notes: l.notes,
  }));

  const { error: erroInsert } = await supabase.from("financial_entries").insert(novos);
  if (erroInsert) return { ok: false, error: "Não foi possível copiar os lançamentos." };

  revalidarFinanceiro();
  return { ok: true, criados: novos.length };
}

// -------------------------------------------------------------
// Recorrências
// -------------------------------------------------------------

function normalizarRecorrencia(values: RecorrenciaFormValues) {
  const dia = values.due_day?.trim();
  return {
    description: values.description.trim(),
    kind: values.kind,
    category_id: values.category_id,
    client_id: limpar(values.client_id),
    amount: paraNumero(values.amount) ?? 0,
    due_day: dia ? Number(dia) : null,
    start_month: values.start_month,
    end_month: limpar(values.end_month),
    active: values.active,
    notes: limpar(values.notes),
  };
}

/** Cria uma recorrência (mensalidade ou custo fixo). */
export async function criarRecorrenciaAction(
  input: RecorrenciaFormValues,
): Promise<ActionResult> {
  const parsed = recorrenciaFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: primeirosErros(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("financial_recurrences")
    .insert(normalizarRecorrencia(parsed.data))
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "Não foi possível salvar a recorrência." };
  }

  revalidarFinanceiro();
  return { ok: true, id: data.id };
}

/** Atualiza uma recorrência. */
export async function atualizarRecorrenciaAction(
  id: string,
  input: RecorrenciaFormValues,
): Promise<ActionResult> {
  const parsed = recorrenciaFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: primeirosErros(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("financial_recurrences")
    .update(normalizarRecorrencia(parsed.data))
    .eq("id", id);

  if (error) return { ok: false, error: "Não foi possível atualizar a recorrência." };

  revalidarFinanceiro();
  return { ok: true, id };
}

/** Ativa/desativa uma recorrência (não exclui histórico já gerado). */
export async function definirAtivaRecorrenciaAction(
  id: string,
  ativa: boolean,
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("financial_recurrences")
    .update({ active: ativa })
    .eq("id", id);
  if (error) return { ok: false, error: "Não foi possível atualizar a recorrência." };
  revalidarFinanceiro();
  return { ok: true, id };
}

/** Exclui uma recorrência; os lançamentos já gerados permanecem. */
export async function excluirRecorrenciaAction(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("financial_recurrences").delete().eq("id", id);
  if (error) return { ok: false, error: "Não foi possível excluir a recorrência." };
  revalidarFinanceiro();
  return { ok: true };
}

/**
 * Gera os lançamentos do mês a partir das recorrências ativas.
 *
 * Substitui o trabalho de recriar, todo mês, a mesma lista de mensalidades
 * e custos fixos. É seguro clicar mais de uma vez: o par
 * (recurrence_id, reference_month) é único no banco, então nada duplica.
 */
export async function gerarLancamentosDoMesAction(
  mes: string,
): Promise<ActionResult & { criados?: number; jaExistiam?: number }> {
  const supabase = createClient();

  const { data: recorrencias, error } = await supabase
    .from("financial_recurrences")
    .select("*")
    .eq("active", true)
    .lte("start_month", mes);

  if (error) return { ok: false, error: "Não foi possível ler as recorrências." };

  const vigentes = (recorrencias ?? []).filter(
    (r) => !r.end_month || r.end_month >= mes,
  );
  if (vigentes.length === 0) {
    return { ok: false, error: "Nenhuma recorrência ativa para este mês." };
  }

  const { data: existentes } = await supabase
    .from("financial_entries")
    .select("recurrence_id")
    .eq("reference_month", mes)
    .not("recurrence_id", "is", null);

  const jaGeradas = new Set((existentes ?? []).map((l) => l.recurrence_id));
  const pendentes = vigentes.filter((r) => !jaGeradas.has(r.id));

  if (pendentes.length === 0) {
    return {
      ok: true,
      criados: 0,
      jaExistiam: vigentes.length,
    };
  }

  const novos: FinancialEntryInsert[] = pendentes.map((r) => ({
    reference_month: mes,
    kind: r.kind,
    category_id: r.category_id,
    client_id: r.client_id,
    description: r.description,
    amount: Number(r.amount),
    status: "Pendente" as const,
    due_date: dataVencimento(mes, r.due_day),
    paid_date: null,
    payment_method: null,
    notes: r.notes,
    recurrence_id: r.id,
  }));

  const { error: erroInsert } = await supabase.from("financial_entries").insert(novos);
  if (erroInsert) {
    return { ok: false, error: "Não foi possível gerar os lançamentos." };
  }

  revalidarFinanceiro();
  return {
    ok: true,
    criados: novos.length,
    jaExistiam: vigentes.length - novos.length,
  };
}

// -------------------------------------------------------------
// Categorias e configuração
// -------------------------------------------------------------

/** Cria uma categoria. */
export async function criarCategoriaAction(
  input: CategoriaFormValues,
): Promise<ActionResult> {
  const parsed = categoriaFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: primeirosErros(parsed.error.flatten().fieldErrors),
    };
  }

  const ordem = parsed.data.sort_order?.trim();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("financial_categories")
    .insert({
      name: parsed.data.name.trim(),
      kind: parsed.data.kind,
      sort_order: ordem ? Number(ordem) : 500,
      active: parsed.data.active,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "Não foi possível salvar a categoria (o nome já existe?)." };
  }

  revalidarFinanceiro();
  revalidatePath("/interno/financeiro/categorias");
  return { ok: true, id: data.id };
}

/** Ativa/desativa uma categoria (categoria usada nunca é excluída). */
export async function definirAtivaCategoriaAction(
  id: string,
  ativa: boolean,
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("financial_categories")
    .update({ active: ativa })
    .eq("id", id);
  if (error) return { ok: false, error: "Não foi possível atualizar a categoria." };
  revalidarFinanceiro();
  revalidatePath("/interno/financeiro/categorias");
  return { ok: true, id };
}

/** Salva o saldo inicial e o mês de partida da série. */
export async function salvarConfiguracaoFinanceiraAction(
  input: ConfiguracaoFinanceiraValues,
): Promise<ActionResult> {
  const parsed = configuracaoFinanceiraSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: primeirosErros(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = createClient();
  const { error } = await supabase.from("financial_settings").upsert({
    id: true,
    opening_balance: paraNumero(parsed.data.opening_balance) ?? 0,
    opening_month: parsed.data.opening_month,
  });

  if (error) return { ok: false, error: "Não foi possível salvar a configuração." };

  revalidarFinanceiro();
  revalidatePath("/interno/financeiro/categorias");
  return { ok: true };
}
