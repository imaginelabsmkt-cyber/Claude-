"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  contentFormSchema,
  type ContentFormValues,
} from "@/lib/validation/content";
import {
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  type ContentPriority,
  type ContentStatus,
} from "@/types";
import { hojeISO } from "@/lib/rules/contents";

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
}

const toNull = (v?: string | null) => {
  const t = typeof v === "string" ? v.trim() : v;
  return t ? t : null;
};
const toArray = (v?: string) =>
  v
    ? v
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

type ParsedContent = ReturnType<typeof contentFormSchema.parse>;

/** Converte os valores validados no objeto de gravação (DB). */
function normalizar(v: ParsedContent) {
  return {
    client_id: v.client_id,
    title: v.title.trim(),
    format: v.format.trim(),
    status: v.status,
    priority: v.priority,
    reference_month: v.reference_month,
    planned_week: v.planned_week,
    description: toNull(v.description),
    content_pillar: toNull(v.content_pillar),
    objective: toNull(v.objective),
    planned_date: toNull(v.planned_date),
    actual_post_date: toNull(v.actual_post_date),
    requires_recording: v.requires_recording,
    recording_date: toNull(v.recording_date),
    recording_location: toNull(v.recording_location),
    participants: toArray(v.participants),
    outfit: toNull(v.outfit),
    required_materials: toArray(v.required_materials),
    planner_id: toNull(v.planner_id),
    recorder_id: toNull(v.recorder_id),
    editor_id: toNull(v.editor_id),
    publisher_id: toNull(v.publisher_id),
    script_deadline: toNull(v.script_deadline),
    recording_deadline: toNull(v.recording_deadline),
    editing_deadline: toNull(v.editing_deadline),
    script_url: toNull(v.script_url),
    raw_files_url: toNull(v.raw_files_url),
    edited_file_url: toNull(v.edited_file_url),
    published_url: toNull(v.published_url),
    notes: toNull(v.notes),
    revision_count: v.revision_count,
    is_fixed_date: v.is_fixed_date,
    is_campaign: v.is_campaign,
  };
}

function primeirosErros(fe: Record<string, string[] | undefined>) {
  const saida: Record<string, string> = {};
  for (const [campo, msgs] of Object.entries(fe)) {
    if (msgs && msgs.length) saida[campo] = msgs[0];
  }
  return saida;
}

export async function criarConteudoAction(
  input: ContentFormValues,
): Promise<ActionResult> {
  const parsed = contentFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: primeirosErros(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("contents")
    .insert(normalizar(parsed.data))
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "Não foi possível salvar o conteúdo." };
  }

  revalidatePath("/conteudos");
  return { ok: true, id: data.id };
}

export async function atualizarConteudoAction(
  id: string,
  input: ContentFormValues,
): Promise<ActionResult> {
  const parsed = contentFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: primeirosErros(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("contents")
    .update(normalizar(parsed.data))
    .eq("id", id);

  if (error) {
    return { ok: false, error: "Não foi possível atualizar o conteúdo." };
  }

  revalidatePath("/conteudos");
  revalidatePath(`/conteudos/${id}`);
  return { ok: true, id };
}

/** Alteração rápida de status. */
export async function definirStatusConteudoAction(
  id: string,
  status: ContentStatus,
): Promise<ActionResult> {
  if (!STATUS_OPTIONS.includes(status)) {
    return { ok: false, error: "Status inválido." };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("contents")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false, error: "Não foi possível alterar o status." };

  revalidatePath("/conteudos");
  revalidatePath(`/conteudos/${id}`);
  return { ok: true, id };
}

/** Alteração rápida de prioridade. */
export async function definirPrioridadeConteudoAction(
  id: string,
  priority: ContentPriority,
): Promise<ActionResult> {
  if (!PRIORITY_OPTIONS.includes(priority)) {
    return { ok: false, error: "Prioridade inválida." };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("contents")
    .update({ priority })
    .eq("id", id);
  if (error)
    return { ok: false, error: "Não foi possível alterar a prioridade." };

  revalidatePath("/conteudos");
  revalidatePath(`/conteudos/${id}`);
  return { ok: true, id };
}

// -------------------------------------------------------------
// Ações de gravação (página de Gravações — Fran)
// -------------------------------------------------------------

/** Marca o conteúdo como Gravado e registra a data (padrão: hoje). */
export async function marcarComoGravadoAction(
  id: string,
  data?: string,
): Promise<ActionResult> {
  const recording_date =
    data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : hojeISO();
  const supabase = createClient();
  const { error } = await supabase
    .from("contents")
    .update({ status: "Gravado", recording_date })
    .eq("id", id);
  if (error) return { ok: false, error: "Não foi possível marcar como gravado." };

  revalidatePath("/gravacoes");
  revalidatePath("/conteudos");
  revalidatePath(`/conteudos/${id}`);
  return { ok: true, id };
}

/** Altera a data de gravação. */
export async function alterarDataGravacaoAction(
  id: string,
  data: string,
): Promise<ActionResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return { ok: false, error: "Data inválida." };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("contents")
    .update({ recording_date: data })
    .eq("id", id);
  if (error) return { ok: false, error: "Não foi possível alterar a data." };

  revalidatePath("/gravacoes");
  revalidatePath(`/conteudos/${id}`);
  return { ok: true, id };
}

/** Adiciona o conteúdo à fila de edição (status Fila de edição). */
export async function adicionarFilaEdicaoAction(
  id: string,
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("contents")
    .update({ status: "Fila de edição" })
    .eq("id", id);
  if (error) {
    return { ok: false, error: "Não foi possível adicionar à fila de edição." };
  }

  revalidatePath("/gravacoes");
  revalidatePath("/fila-edicao");
  revalidatePath("/conteudos");
  revalidatePath(`/conteudos/${id}`);
  return { ok: true, id };
}
