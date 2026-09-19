"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { usuarioAtualId } from "@/lib/auth";
import { ehArte, hojeISO } from "@/lib/rules/contents";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

function revalidar() {
  revalidatePath("/favie");
}

/** Cria uma ideia (nasce com formato e pilar). */
export async function criarIdeiaAction(input: {
  clientId: string;
  title: string;
  format?: string | null;
  pillar?: string | null;
  notes?: string | null;
}): Promise<ActionResult> {
  const userId = await usuarioAtualId();
  if (!userId) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const title = (input.title ?? "").trim();
  if (!title) return { ok: false, error: "Escreva a ideia." };
  if (!input.clientId) return { ok: false, error: "Espaço inválido." };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("content_ideas")
    .insert({
      client_id: input.clientId,
      title: title.slice(0, 300),
      format: (input.format ?? "").trim() || null,
      pillar: (input.pillar ?? "").trim() || null,
      notes: (input.notes ?? "").trim() || null,
      created_by: userId,
    })
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: "Não foi possível salvar a ideia." };
  revalidar();
  return { ok: true, id: data?.id };
}

export interface IdeiaPatch {
  title?: string;
  format?: string | null;
  pillar?: string | null;
  notes?: string | null;
  status?: string;
}

/** Atualiza uma ideia (título, formato, pilar, nota, status). */
export async function atualizarIdeiaAction(
  id: string,
  patch: IdeiaPatch,
): Promise<ActionResult> {
  if (!(await usuarioAtualId())) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }
  const dados: Record<string, unknown> = {};
  if ("title" in patch) {
    const t = (patch.title ?? "").trim();
    if (!t) return { ok: false, error: "A ideia não pode ficar vazia." };
    dados.title = t.slice(0, 300);
  }
  if ("format" in patch) dados.format = (patch.format ?? "").trim() || null;
  if ("pillar" in patch) dados.pillar = (patch.pillar ?? "").trim() || null;
  if ("notes" in patch) dados.notes = (patch.notes ?? "").trim() || null;
  if ("status" in patch) dados.status = patch.status;
  if (Object.keys(dados).length === 0) {
    return { ok: false, error: "Nada para salvar." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("content_ideas")
    .update(dados)
    .eq("id", id);
  if (error) return { ok: false, error: "Não foi possível salvar." };
  revalidar();
  return { ok: true, id };
}

/** Arquiva uma ideia (descartada, mas fica guardada). */
export async function arquivarIdeiaAction(id: string): Promise<ActionResult> {
  if (!(await usuarioAtualId())) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("content_ideas")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: "Não foi possível arquivar." };
  revalidar();
  return { ok: true, id };
}

/**
 * "Produzir": transforma a ideia num CONTEÚDO no fluxo normal (usando o
 * formato e o pilar). A ideia sai do banco e passa a viver na Produção.
 */
export async function promoverIdeiaAction(id: string): Promise<ActionResult> {
  const userId = await usuarioAtualId();
  if (!userId) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const supabase = createClient();
  const { data: ideia } = await supabase
    .from("content_ideas")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!ideia) return { ok: false, error: "Ideia não encontrada." };
  if (ideia.promoted_content_id) {
    return { ok: false, error: "Essa ideia já virou conteúdo." };
  }

  const mes = hojeISO().slice(0, 7);
  const precisaGravar = !ehArte(ideia.format);

  const { data: novo, error } = await supabase
    .from("contents")
    .insert({
      client_id: ideia.client_id,
      title: ideia.title,
      format: ideia.format,
      status: "Planejamento",
      priority: "Média",
      reference_month: mes,
      planned_week: null,
      planned_date: null,
      actual_post_date: null,
      requires_recording: precisaGravar,
      recording_date: null,
      recording_location: null,
      outfit: null,
      participants: [],
      description: null,
      content_pillar: ideia.pillar,
      objective: null,
      planner_id: null,
      recorder_id: null,
      editor_id: null,
      publisher_id: null,
      script_deadline: null,
      recording_deadline: null,
      editing_deadline: null,
      script_url: null,
      raw_files_url: null,
      edited_file_url: null,
      published_url: null,
      notes: ideia.notes,
    })
    .select("id")
    .maybeSingle();
  if (error || !novo) {
    return { ok: false, error: "Não foi possível criar o conteúdo." };
  }

  await supabase
    .from("content_ideas")
    .update({ promoted_content_id: novo.id, status: "Escolhida" })
    .eq("id", id);

  revalidar();
  revalidatePath("/conteudos");
  return { ok: true, id: novo.id };
}
