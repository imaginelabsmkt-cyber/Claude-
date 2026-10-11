"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { paraNumero } from "@/lib/financeiro/valores";
import { dataVencimento } from "@/lib/financeiro/meses";
import { fixosAGerar } from "@/lib/pessoal/calculo";
import {
  fixoPessoalFormSchema,
  gastoPessoalFormSchema,
  type FixoPessoalFormValues,
  type GastoPessoalFormValues,
} from "@/lib/validation/pessoal";
import type { PersonalEntryInsert } from "@/types";

/**
 * Ações da aba pessoal.
 *
 * REGRA DESTE ARQUIVO: nenhuma função escreve `user_id`. A coluna tem
 * `default auth.uid()` e a policy exige `user_id = auth.uid()` no
 * `with check` — então a linha nasce de quem está logado, e mandar o
 * id de outra pessoa é rejeitado pelo banco. Não escrever o campo é o
 * que torna impossível errar aqui.
 *
 * Também não existe filtro `.eq("user_id", ...)` em nenhum update ou
 * delete: o RLS já restringe o alcance a quem é dono. Um `update`
 * apontando para a linha da outra sócia afeta zero linhas.
 */

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
}

function primeirosErros(
  fieldErrors: Record<string, string[] | undefined>,
): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const [campo, msgs] of Object.entries(fieldErrors)) {
    if (msgs && msgs.length > 0) saida[campo] = msgs[0];
  }
  return saida;
}

function limpar(v?: string | null): string | null {
  const t = v?.trim();
  return t ? t : null;
}

function revalidar() {
  revalidatePath("/interno/meus-gastos");
}

// -------------------------------------------------------------
// Lançamentos
// -------------------------------------------------------------

function normalizarGasto(v: GastoPessoalFormValues) {
  return {
    reference_month: v.reference_month,
    kind: v.kind,
    category: v.category.trim(),
    description: v.description.trim(),
    amount: paraNumero(v.amount) ?? 0,
    entry_date: limpar(v.entry_date),
    paid: v.paid,
    notes: limpar(v.notes),
  };
}

export async function criarGastoPessoalAction(
  input: GastoPessoalFormValues,
): Promise<ActionResult> {
  const parsed = gastoPessoalFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: primeirosErros(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("personal_entries")
    .insert(normalizarGasto(parsed.data))
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: "Não foi possível salvar." };

  revalidar();
  return { ok: true, id: data.id };
}

export async function atualizarGastoPessoalAction(
  id: string,
  input: GastoPessoalFormValues,
): Promise<ActionResult> {
  const parsed = gastoPessoalFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: primeirosErros(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("personal_entries")
    .update(normalizarGasto(parsed.data))
    .eq("id", id);

  if (error) return { ok: false, error: "Não foi possível salvar." };

  revalidar();
  return { ok: true, id };
}

/** Marca/desmarca como pago, sem abrir formulário. */
export async function alternarPagoPessoalAction(
  id: string,
  pago: boolean,
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("personal_entries")
    .update({ paid: pago })
    .eq("id", id);

  if (error) return { ok: false, error: "Não foi possível atualizar." };

  revalidar();
  return { ok: true, id };
}

export async function excluirGastoPessoalAction(
  id: string,
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("personal_entries").delete().eq("id", id);

  if (error) return { ok: false, error: "Não foi possível excluir." };

  revalidar();
  return { ok: true };
}

// -------------------------------------------------------------
// Plano fixo
// -------------------------------------------------------------

function normalizarFixo(v: FixoPessoalFormValues) {
  const dia = v.due_day?.trim();
  return {
    kind: v.kind,
    category: v.category.trim(),
    description: v.description.trim(),
    amount: paraNumero(v.amount) ?? 0,
    due_day: dia ? Number(dia) : null,
    start_month: v.start_month,
    end_month: limpar(v.end_month),
    active: v.active,
  };
}

export async function criarFixoPessoalAction(
  input: FixoPessoalFormValues,
): Promise<ActionResult> {
  const parsed = fixoPessoalFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: primeirosErros(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("personal_recurrences")
    .insert(normalizarFixo(parsed.data))
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: "Não foi possível salvar." };

  revalidar();
  return { ok: true, id: data.id };
}

export async function atualizarFixoPessoalAction(
  id: string,
  input: FixoPessoalFormValues,
): Promise<ActionResult> {
  const parsed = fixoPessoalFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: primeirosErros(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("personal_recurrences")
    .update(normalizarFixo(parsed.data))
    .eq("id", id);

  if (error) return { ok: false, error: "Não foi possível salvar." };

  revalidar();
  return { ok: true, id };
}

export async function excluirFixoPessoalAction(
  id: string,
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("personal_recurrences")
    .delete()
    .eq("id", id);

  if (error) return { ok: false, error: "Não foi possível excluir." };

  revalidar();
  return { ok: true };
}

/**
 * Cria os lançamentos do mês a partir do plano fixo.
 *
 * Pode ser clicado à vontade: o par (recurrence_id, reference_month) é
 * único no banco, e aqui a gente já filtra o que existe para não
 * mandar insert que vai falhar.
 */
export async function gerarFixosDoMesAction(
  mes: string,
): Promise<ActionResult & { criados?: number }> {
  const supabase = createClient();

  const [{ data: fixos, error }, { data: existentes }] = await Promise.all([
    supabase.from("personal_recurrences").select("*").eq("active", true),
    supabase
      .from("personal_entries")
      .select("recurrence_id")
      .eq("reference_month", mes)
      .not("recurrence_id", "is", null),
  ]);

  if (error) return { ok: false, error: "Não foi possível ler o plano fixo." };

  const faltam = fixosAGerar(fixos ?? [], existentes ?? [], mes);
  if (faltam.length === 0) {
    return { ok: true, criados: 0 };
  }

  const novos: PersonalEntryInsert[] = faltam.map((f) => ({
    reference_month: mes,
    kind: f.kind,
    category: f.category,
    description: f.description,
    amount: Number(f.amount),
    entry_date: dataVencimento(mes, f.due_day),
    // Fixo do mês nasce EM ABERTO: ainda não venceu.
    paid: false,
    recurrence_id: f.id,
  }));

  const { error: erroInsert } = await supabase
    .from("personal_entries")
    .insert(novos);

  if (erroInsert) {
    return { ok: false, error: "Não foi possível gerar os lançamentos." };
  }

  revalidar();
  return { ok: true, criados: novos.length };
}

// -------------------------------------------------------------
// Quem sou eu na equipe
// -------------------------------------------------------------

/**
 * Liga o login de quem chama a uma pessoa da equipe, para a aba
 * pessoal poder mostrar o pró-labore sem redigitação.
 *
 * Quem decide é o banco (`vincular_me_a_pessoa`): ele só aceita uma
 * pessoa sem dono, ou a que já é sua.
 */
export async function vincularMeAPessoaAction(
  pessoaId: string,
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("vincular_me_a_pessoa", {
    pessoa: pessoaId,
  });

  if (error) {
    return {
      ok: false,
      error: error.message.includes("já está ligada")
        ? "Essa pessoa já está ligada a outro login."
        : "Não foi possível vincular.",
    };
  }

  revalidar();
  revalidatePath("/interno/pessoas");
  return { ok: true };
}
