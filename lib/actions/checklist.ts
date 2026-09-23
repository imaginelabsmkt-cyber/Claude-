"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { usuarioAtualId } from "@/lib/auth";
import { itensPadrao, type ChecklistKind } from "@/lib/checklist/defaults";

export interface ChecklistResult {
  ok: boolean;
  error?: string;
}

/** Marca/desmarca um item do checklist. */
export async function alternarChecklistAction(
  clientId: string,
  id: string,
  done: boolean,
): Promise<ChecklistResult> {
  if (!(await usuarioAtualId())) return { ok: false, error: "Sessão expirada." };
  const supabase = createClient();
  const { error } = await supabase
    .from("client_checklist_items")
    .update({ done, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: "Não foi possível salvar." };
  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}

/** Adiciona um item ao checklist. */
export async function adicionarChecklistAction(
  clientId: string,
  kind: ChecklistKind,
  label: string,
): Promise<ChecklistResult> {
  if (!label.trim()) return { ok: false, error: "Escreva o item." };
  if (!(await usuarioAtualId())) return { ok: false, error: "Sessão expirada." };
  const supabase = createClient();
  const { error } = await supabase.from("client_checklist_items").insert({
    client_id: clientId,
    kind,
    label: label.trim().slice(0, 200),
    position: 999,
  });
  if (error) return { ok: false, error: "Não foi possível adicionar." };
  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}

/** Remove um item do checklist. */
export async function removerChecklistAction(
  clientId: string,
  id: string,
): Promise<ChecklistResult> {
  if (!(await usuarioAtualId())) return { ok: false, error: "Sessão expirada." };
  const supabase = createClient();
  const { error } = await supabase
    .from("client_checklist_items")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: "Não foi possível remover." };
  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}

/** Gera os itens padrão de um checklist (para clientes antigos, sem itens). */
export async function gerarChecklistPadraoAction(
  clientId: string,
  kind: ChecklistKind,
): Promise<ChecklistResult> {
  if (!(await usuarioAtualId())) return { ok: false, error: "Sessão expirada." };
  const supabase = createClient();
  const linhas = itensPadrao(kind).map((label, i) => ({
    client_id: clientId,
    kind,
    label,
    position: i,
  }));
  const { error } = await supabase
    .from("client_checklist_items")
    .insert(linhas);
  if (error) return { ok: false, error: "Não foi possível gerar." };
  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}
