"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hojeISO, periodoCorrente } from "@/lib/empresa/obrigacoes";
import {
  obrigacaoFormSchema,
  type ObrigacaoFormValues,
} from "@/lib/validation/empresa";
import type { ObligationCadence } from "@/types";

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
  revalidatePath("/interno");
  revalidatePath("/interno/contabil");
  revalidatePath("/interno/administrativo");
}

/** Monta a linha do banco, zerando os campos que a periodicidade não usa. */
function normalizar(values: ObrigacaoFormValues) {
  const unica = values.cadence === "Única";
  const anual = values.cadence === "Anual";
  const trimestral = values.cadence === "Trimestral";

  return {
    title: values.title.trim(),
    area: values.area,
    cadence: values.cadence as ObligationCadence,
    due_day: unica ? null : Number(values.due_day),
    // Anual precisa do mês; trimestral usa como âncora; mensal não usa.
    due_month: anual || trimestral ? Number(values.due_month) : null,
    due_date: unica ? limpar(values.due_date) : null,
    alert_days: values.alert_days ? Number(values.alert_days) : 7,
    notes: limpar(values.notes),
    active: true,
  };
}

/** Cria uma obrigação com prazo. */
export async function criarObrigacaoAction(
  input: ObrigacaoFormValues,
): Promise<ActionResult> {
  const parsed = obrigacaoFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: primeirosErros(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("company_obligations")
    .insert(normalizar(parsed.data))
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "Não foi possível salvar a obrigação." };
  }

  revalidar();
  return { ok: true, id: data.id };
}

/** Atualiza uma obrigação. */
export async function atualizarObrigacaoAction(
  id: string,
  input: ObrigacaoFormValues,
): Promise<ActionResult> {
  const parsed = obrigacaoFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: primeirosErros(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("company_obligations")
    .update(normalizar(parsed.data))
    .eq("id", id);

  if (error) return { ok: false, error: "Não foi possível atualizar." };

  revalidar();
  return { ok: true, id };
}

/** Desativa uma obrigação (o histórico de períodos cumpridos fica). */
export async function desativarObrigacaoAction(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("company_obligations")
    .update({ active: false })
    .eq("id", id);
  if (error) return { ok: false, error: "Não foi possível desativar." };
  revalidar();
  return { ok: true, id };
}

/**
 * Marca um período como cumprido.
 *
 * O período vem da tela (é o que está em aberto); sem ele, cai no
 * período corrente. A unicidade `(obligation_id, period)` no banco
 * impede marcar duas vezes o mesmo período.
 */
export async function marcarCumpridaAction(
  id: string,
  periodo?: string,
): Promise<ActionResult> {
  const supabase = createClient();

  const { data: obrigacao } = await supabase
    .from("company_obligations")
    .select("cadence, due_day, due_month, due_date, alert_days")
    .eq("id", id)
    .maybeSingle();

  if (!obrigacao) return { ok: false, error: "Obrigação não encontrada." };

  const chave = periodo ?? periodoCorrente(obrigacao);

  const { error } = await supabase.from("obligation_completions").insert({
    obligation_id: id,
    period: chave,
    completed_at: hojeISO(),
  });

  if (error) {
    // 23505 = violação de unicidade: já estava marcado.
    if (error.code === "23505") {
      return { ok: false, error: "Esse período já estava marcado como cumprido." };
    }
    return { ok: false, error: "Não foi possível marcar como cumprida." };
  }

  revalidar();
  return { ok: true, id };
}

/** Desfaz a marcação de um período. */
export async function desmarcarCumpridaAction(
  id: string,
  periodo: string,
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("obligation_completions")
    .delete()
    .eq("obligation_id", id)
    .eq("period", periodo);
  if (error) return { ok: false, error: "Não foi possível desfazer." };
  revalidar();
  return { ok: true, id };
}
