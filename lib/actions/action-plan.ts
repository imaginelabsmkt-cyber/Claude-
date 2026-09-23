"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { usuarioAtualId } from "@/lib/auth";
import type { ActionPlanItemInsert } from "@/types";

export interface EstrategiaResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export interface DadosEstrategia {
  id?: string;
  title: string;
  type?: string | null;
  status?: string;
  description?: string | null;
  due_date?: string | null;
  assignee_id?: string | null;
  file_path?: string | null;
  file_name?: string | null;
}

/** Cria ou atualiza uma estratégia do plano de ação. */
export async function salvarEstrategiaAction(
  clientId: string,
  dados: DadosEstrategia,
): Promise<EstrategiaResult> {
  if (!clientId || !dados.title?.trim()) {
    return { ok: false, error: "Dê um nome à estratégia." };
  }
  if (!(await usuarioAtualId())) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }
  const supabase = createClient();

  const registro: ActionPlanItemInsert = {
    client_id: clientId,
    title: dados.title.trim().slice(0, 200),
    type: dados.type?.trim() || null,
    status: dados.status || "A fazer",
    description: dados.description?.trim().slice(0, 4000) || null,
    due_date: dados.due_date || null,
    assignee_id: dados.assignee_id || null,
    updated_at: new Date().toISOString(),
  };
  // Só mexe no arquivo quando vier explicitamente (undefined = mantém).
  if (dados.file_path !== undefined) registro.file_path = dados.file_path;
  if (dados.file_name !== undefined) registro.file_name = dados.file_name;

  if (dados.id) {
    const { error } = await supabase
      .from("action_plan_items")
      .update(registro)
      .eq("id", dados.id);
    if (error) return { ok: false, error: "Não foi possível salvar." };
    revalidatePath(`/clientes/${clientId}`);
    return { ok: true, id: dados.id };
  }

  const { data, error } = await supabase
    .from("action_plan_items")
    .insert(registro)
    .select("id")
    .single();
  if (error) return { ok: false, error: "Não foi possível criar." };
  revalidatePath(`/clientes/${clientId}`);
  return { ok: true, id: data.id };
}

/** Muda só o status de uma estratégia (rápido). */
export async function statusEstrategiaAction(
  clientId: string,
  id: string,
  status: string,
): Promise<EstrategiaResult> {
  if (!(await usuarioAtualId())) {
    return { ok: false, error: "Sessão expirada." };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("action_plan_items")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: "Não foi possível salvar." };
  revalidatePath(`/clientes/${clientId}`);
  return { ok: true, id };
}

/** Remove uma estratégia (arquiva). */
export async function excluirEstrategiaAction(
  clientId: string,
  id: string,
): Promise<EstrategiaResult> {
  if (!(await usuarioAtualId())) {
    return { ok: false, error: "Sessão expirada." };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("action_plan_items")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: "Não foi possível remover." };
  revalidatePath(`/clientes/${clientId}`);
  return { ok: true, id };
}
