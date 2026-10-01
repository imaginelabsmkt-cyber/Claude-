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
  owner?: string;
  stage?: string | null;
  date_label?: string | null;
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
  // Dimensões do cronograma (só mexe quando vierem — undefined = mantém).
  if (dados.owner !== undefined) registro.owner = dados.owner || "FAVIE";
  if (dados.stage !== undefined) registro.stage = dados.stage || null;
  if (dados.date_label !== undefined)
    registro.date_label = dados.date_label?.trim() || null;
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

export interface ItemImportado {
  title: string;
  owner?: string;
  status?: string;
  date_label?: string | null;
  due_date?: string | null;
  stage?: string | null;
}

/**
 * Importa vários itens do cronograma de uma vez (prévia já revisada pela
 * pessoa). Cada item vira uma linha do plano de ação, em ordem.
 */
export async function importarCronogramaAction(
  clientId: string,
  itens: ItemImportado[],
): Promise<EstrategiaResult & { quantidade?: number }> {
  if (!clientId) return { ok: false, error: "Cliente inválido." };
  if (!(await usuarioAtualId())) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }
  const limpos = (itens ?? []).filter((i) => i.title?.trim());
  if (limpos.length === 0) return { ok: false, error: "Nada para importar." };

  const supabase = createClient();
  // Continua a numeração de posição a partir do que já existe.
  const { data: ultimos } = await supabase
    .from("action_plan_items")
    .select("position")
    .eq("client_id", clientId)
    .order("position", { ascending: false })
    .limit(1);
  let pos = (ultimos?.[0]?.position ?? 0) + 1;

  const DATA_OK = (v?: string | null) =>
    !v || /^\d{4}-\d{2}-\d{2}$/.test(v);

  const registros: ActionPlanItemInsert[] = limpos.map((i) => ({
    client_id: clientId,
    title: i.title.trim().slice(0, 200),
    owner: i.owner === "Cliente" ? "Cliente" : "FAVIE",
    status: i.status || "A fazer",
    date_label: i.date_label?.trim() || null,
    due_date: DATA_OK(i.due_date) ? i.due_date || null : null,
    stage: i.stage || null,
    position: pos++,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("action_plan_items").insert(registros);
  if (error) return { ok: false, error: "Não foi possível importar." };
  revalidatePath(`/clientes/${clientId}`);
  return { ok: true, quantidade: registros.length };
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
