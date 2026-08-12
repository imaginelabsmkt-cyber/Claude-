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
import { registrarHistorico, diffConteudo } from "@/lib/history";
import { usuarioAtualId } from "@/lib/auth";
import {
  sincronizarGravacao,
  sincronizarEdicao,
  removerGoogleDoConteudo,
} from "@/lib/google/sync";
import { formatarData } from "@/lib/utils";

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
    script: toNull(v.script),
    caption: toNull(v.caption),
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

  // Estado anterior + perfis (para o histórico)
  const { data: antigo } = await supabase
    .from("contents")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const { data: perfis } = await supabase.from("profiles").select("id, name");
  const nomePorId = new Map((perfis ?? []).map((p) => [p.id, p.name]));

  const novo = normalizar(parsed.data);
  const { error } = await supabase.from("contents").update(novo).eq("id", id);

  if (error) {
    return { ok: false, error: "Não foi possível atualizar o conteúdo." };
  }

  if (antigo) {
    await registrarHistorico(id, diffConteudo(antigo, novo, nomePorId));
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
  const { data: antigo } = await supabase
    .from("contents")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  // Ao sair do conjunto da fila de edição, zera a posição manual — senão a
  // posição fica "presa" e pode duplicar/embaralhar a ordem se o item voltar.
  const NA_FILA: ContentStatus[] = [
    "Gravado",
    "Fila de edição",
    "Em edição",
    "Ajustes",
  ];
  const dados: { status: ContentStatus; editing_queue_position?: number | null } =
    { status };
  if (!NA_FILA.includes(status)) dados.editing_queue_position = null;

  const { error } = await supabase.from("contents").update(dados).eq("id", id);
  if (error) return { ok: false, error: "Não foi possível alterar o status." };

  await registrarHistorico(id, [
    { field: "Status", old: antigo?.status ?? null, new: status },
  ]);

  await sincronizarEdicao(id, status);

  revalidatePath("/conteudos");
  revalidatePath("/fila-edicao");
  revalidatePath("/gravacoes");
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
  const { data: antigo } = await supabase
    .from("contents")
    .select("priority")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase
    .from("contents")
    .update({ priority })
    .eq("id", id);
  if (error)
    return { ok: false, error: "Não foi possível alterar a prioridade." };

  await registrarHistorico(id, [
    { field: "Prioridade", old: antigo?.priority ?? null, new: priority },
  ]);

  revalidatePath("/conteudos");
  revalidatePath("/fila-edicao");
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
  const { data: antigo } = await supabase
    .from("contents")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase
    .from("contents")
    .update({ status: "Gravado", recording_date })
    .eq("id", id);
  if (error) return { ok: false, error: "Não foi possível marcar como gravado." };

  await registrarHistorico(id, [
    { field: "Status", old: antigo?.status ?? null, new: "Gravado" },
  ]);

  await sincronizarGravacao(id);

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

  await sincronizarGravacao(id);

  revalidatePath("/gravacoes");
  revalidatePath(`/conteudos/${id}`);
  return { ok: true, id };
}

/** Adiciona o conteúdo à fila de edição (status Fila de edição). */
export async function adicionarFilaEdicaoAction(
  id: string,
): Promise<ActionResult> {
  const supabase = createClient();
  const { data: antigo } = await supabase
    .from("contents")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase
    .from("contents")
    .update({ status: "Fila de edição" })
    .eq("id", id);
  if (error) {
    return { ok: false, error: "Não foi possível adicionar à fila de edição." };
  }

  await registrarHistorico(id, [
    { field: "Status", old: antigo?.status ?? null, new: "Fila de edição" },
  ]);

  await sincronizarEdicao(id, "Fila de edição");

  revalidatePath("/gravacoes");
  revalidatePath("/fila-edicao");
  revalidatePath("/conteudos");
  revalidatePath(`/conteudos/${id}`);
  return { ok: true, id };
}

/**
 * Persiste a ordem manual da fila de edição. Recebe os ids na nova ordem
 * e grava editing_queue_position = 1..N. A ordem manual passa a ter
 * prioridade sobre a ordenação automática.
 */
export async function reordenarFilaEdicaoAction(
  orderedIds: string[],
): Promise<ActionResult> {
  const supabase = createClient();

  // Posições anteriores (para o histórico)
  const { data: atuais } = await supabase
    .from("contents")
    .select("id, editing_queue_position")
    .in("id", orderedIds);
  const antigaPos = new Map(
    (atuais ?? []).map((c) => [c.id, c.editing_queue_position]),
  );

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("contents")
      .update({ editing_queue_position: i + 1 })
      .eq("id", orderedIds[i]);
    if (error) {
      return { ok: false, error: "Não foi possível salvar a nova ordem." };
    }
  }

  // Registra somente as posições que mudaram
  for (let i = 0; i < orderedIds.length; i++) {
    const anterior = antigaPos.get(orderedIds[i]);
    if (anterior !== i + 1) {
      await registrarHistorico(orderedIds[i], [
        {
          field: "Posição na fila",
          old: anterior != null ? String(anterior) : "—",
          new: String(i + 1),
        },
      ]);
    }
  }

  revalidatePath("/fila-edicao");
  return { ok: true };
}

// -------------------------------------------------------------
// Postagens: alterar a data prevista (registra no histórico)
// -------------------------------------------------------------

/**
 * Altera a data prevista de postagem (planned_date). Mantém planned_week e
 * demais dados de produção, e registra a mudança em content_history.
 */
export async function alterarDataPostagemAction(
  id: string,
  novaData: string | null,
): Promise<ActionResult> {
  if (novaData !== null && !/^\d{4}-\d{2}-\d{2}$/.test(novaData)) {
    return { ok: false, error: "Data inválida." };
  }
  const supabase = createClient();

  // Valor anterior (para o histórico)
  const { data: atual } = await supabase
    .from("contents")
    .select("planned_date")
    .eq("id", id)
    .maybeSingle();
  const anterior = atual?.planned_date ?? null;

  const { error } = await supabase
    .from("contents")
    .update({ planned_date: novaData })
    .eq("id", id);
  if (error) return { ok: false, error: "Não foi possível alterar a data." };

  await registrarHistorico(id, [
    {
      field: "Data prevista",
      old: anterior ? formatarData(anterior) : "—",
      new: novaData ? formatarData(novaData) : "—",
    },
  ]);

  revalidatePath("/postagens");
  revalidatePath("/conteudos");
  revalidatePath(`/conteudos/${id}`);
  return { ok: true, id };
}

/** Salva o texto do roteiro (edição rápida, inclusive na gravação). */
export async function atualizarRoteiroAction(
  id: string,
  script: string | null,
): Promise<ActionResult> {
  if (!(await usuarioAtualId())) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("contents")
    .update({ script: script && script.trim() ? script : null })
    .eq("id", id);
  if (error) return { ok: false, error: "Não foi possível salvar o roteiro." };

  revalidatePath(`/conteudos/${id}`);
  return { ok: true, id };
}

// -------------------------------------------------------------
// Preenchimento por etapa (produção)
// -------------------------------------------------------------

/** Campos preenchidos ao longo da produção (gravação / edição / postagem). */
export interface ContentStagePatch {
  requires_recording?: boolean;
  recording_date?: string | null;
  recording_time?: string | null;
  recording_location?: string | null;
  participants?: string[];
  outfit?: string | null;
  required_materials?: string[];
  script_deadline?: string | null;
  recording_deadline?: string | null;
  editing_deadline?: string | null;
  reference_url?: string | null;
  script_url?: string | null;
  raw_files_url?: string | null;
  edited_file_url?: string | null;
  published_url?: string | null;
  actual_post_date?: string | null;
}

const ROTULO_ETAPA: Record<keyof ContentStagePatch, string> = {
  requires_recording: "Precisa de gravação",
  recording_date: "Data de gravação",
  recording_time: "Horário de gravação",
  recording_location: "Local",
  participants: "Participantes",
  outfit: "Roupa",
  required_materials: "Materiais",
  script_deadline: "Prazo do roteiro",
  recording_deadline: "Prazo da gravação",
  editing_deadline: "Prazo da edição",
  reference_url: "Referência",
  script_url: "Link do roteiro",
  raw_files_url: "Arquivos brutos",
  edited_file_url: "Arquivo editado",
  published_url: "Link publicado",
  actual_post_date: "Data real",
};

const CAMPOS_DATA: (keyof ContentStagePatch)[] = [
  "recording_date",
  "script_deadline",
  "recording_deadline",
  "editing_deadline",
  "actual_post_date",
];
const CAMPOS_TEXTO: (keyof ContentStagePatch)[] = [
  "recording_time",
  "recording_location",
  "outfit",
  "reference_url",
  "script_url",
  "raw_files_url",
  "edited_file_url",
  "published_url",
];

/**
 * Atualiza campos de produção de um conteúdo (gravação/edição/postagem).
 * Usado nos painéis por etapa, para preencher só o necessário de cada vez.
 */
export async function atualizarProducaoConteudoAction(
  id: string,
  patch: ContentStagePatch,
): Promise<ActionResult> {
  const chaves = Object.keys(patch) as (keyof ContentStagePatch)[];
  if (chaves.length === 0) return { ok: false, error: "Nada para salvar." };
  if (chaves.some((k) => !(k in ROTULO_ETAPA))) {
    return { ok: false, error: "Campo não editável." };
  }

  const dados: Record<string, unknown> = {};

  for (const campo of CAMPOS_DATA) {
    if (campo in patch) {
      const v = patch[campo] as string | null | undefined;
      if (v != null && v !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        return { ok: false, error: "Data inválida." };
      }
      dados[campo] = v ? v : null;
    }
  }
  for (const campo of CAMPOS_TEXTO) {
    if (campo in patch) {
      dados[campo] = toNull(patch[campo] as string | null | undefined);
    }
  }
  if ("requires_recording" in patch) {
    dados.requires_recording = Boolean(patch.requires_recording);
  }
  if ("participants" in patch) {
    dados.participants = (patch.participants ?? [])
      .map((p) => p.trim())
      .filter(Boolean);
  }
  if ("required_materials" in patch) {
    dados.required_materials = (patch.required_materials ?? [])
      .map((p) => p.trim())
      .filter(Boolean);
  }

  const supabase = createClient();

  // valor anterior de cada campo alterado (para o histórico legível)
  const chavesDados = Object.keys(dados) as (keyof ContentStagePatch)[];
  const { data: antes } = await supabase
    .from("contents")
    .select(chavesDados.join(", "))
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("contents")
    .update(dados as ContentStagePatch)
    .eq("id", id);
  if (error) return { ok: false, error: "Não foi possível salvar." };

  const textoDe = (valor: unknown): string => {
    if (Array.isArray(valor)) return valor.join(", ") || "—";
    if (valor == null || valor === "") return "—";
    if (typeof valor === "boolean") return valor ? "Sim" : "Não";
    return String(valor);
  };
  const registros = chavesDados
    .map((k) => {
      const anterior = antes
        ? textoDe((antes as unknown as Record<string, unknown>)[k])
        : "—";
      return { field: ROTULO_ETAPA[k], old: anterior, new: textoDe(dados[k]) };
    })
    .filter((r) => r.old !== r.new);
  if (registros.length > 0) await registrarHistorico(id, registros);

  // Se mexeu em algo da gravação, atualiza o evento no Google.
  if (
    "recording_date" in patch ||
    "recording_time" in patch ||
    "recording_location" in patch ||
    "participants" in patch
  ) {
    await sincronizarGravacao(id);
  }

  revalidatePath("/conteudos");
  revalidatePath(`/conteudos/${id}`);
  revalidatePath("/gravacoes");
  revalidatePath("/fila-edicao");
  revalidatePath("/postagens");
  return { ok: true, id };
}

// -------------------------------------------------------------
// Edição inline (planilha)
// -------------------------------------------------------------

/** Campos editáveis direto na planilha e como aparecem no histórico. */
export interface ContentEditPatch {
  title?: string;
  format?: string | null;
  planned_week?: number | null;
  planned_date?: string | null;
  planner_id?: string | null;
  recorder_id?: string | null;
  editor_id?: string | null;
  publisher_id?: string | null;
}

const ROTULO_CAMPO: Record<keyof ContentEditPatch, string> = {
  title: "Título",
  format: "Formato",
  planned_week: "Semana prevista",
  planned_date: "Data prevista",
  planner_id: "Responsável (planejamento)",
  recorder_id: "Responsável (gravação)",
  editor_id: "Responsável (edição)",
  publisher_id: "Responsável (postagem)",
};

/**
 * Atualiza um único campo de um conteúdo a partir da planilha editável.
 * Aceita apenas os campos da whitelist, valida e registra no histórico.
 */
export async function atualizarCampoConteudoAction(
  id: string,
  patch: ContentEditPatch,
): Promise<ActionResult> {
  const chaves = Object.keys(patch) as (keyof ContentEditPatch)[];
  if (chaves.length === 0) return { ok: false, error: "Nada para salvar." };
  if (chaves.some((k) => !(k in ROTULO_CAMPO))) {
    return { ok: false, error: "Campo não editável." };
  }

  const dados: ContentEditPatch = {};

  if ("title" in patch) {
    const t = (patch.title ?? "").trim();
    if (!t) return { ok: false, error: "O título não pode ficar vazio." };
    dados.title = t;
  }
  if ("format" in patch) dados.format = toNull(patch.format);
  if ("planned_week" in patch) {
    dados.planned_week =
      patch.planned_week == null ? null : Number(patch.planned_week);
  }
  if ("planned_date" in patch) {
    const d = patch.planned_date;
    // string vazia = limpar a data
    if (d != null && d !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      return { ok: false, error: "Data inválida." };
    }
    dados.planned_date = d ? d : null;
  }
  const CAMPOS_RESP = [
    "planner_id",
    "recorder_id",
    "editor_id",
    "publisher_id",
  ] as const;
  for (const campo of CAMPOS_RESP) {
    if (campo in patch) dados[campo] = toNull(patch[campo]);
  }

  const supabase = createClient();

  // valor anterior (para o histórico legível), incluindo responsáveis
  const { data: antes } = await supabase
    .from("contents")
    .select(
      "title, format, planned_week, planned_date, planner_id, recorder_id, editor_id, publisher_id",
    )
    .eq("id", id)
    .maybeSingle();
  const anterior = (antes ?? {}) as Record<string, unknown>;

  const { error } = await supabase
    .from("contents")
    .update(dados)
    .eq("id", id);
  if (error) return { ok: false, error: "Não foi possível salvar." };

  // nomes dos responsáveis (id -> nome) para deixar o histórico legível
  const idsResp = new Set<string>();
  for (const campo of CAMPOS_RESP) {
    const ant = anterior[campo];
    if (typeof ant === "string") idsResp.add(ant);
    const novo = dados[campo];
    if (typeof novo === "string") idsResp.add(novo);
  }
  const nomePorId = new Map<string, string>();
  if (idsResp.size > 0) {
    const { data: perfis } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", [...idsResp]);
    for (const p of perfis ?? []) nomePorId.set(p.id, p.name);
  }
  const nomeDe = (v: unknown) =>
    typeof v === "string" ? (nomePorId.get(v) ?? "—") : "—";

  const chavesAlteradas = Object.keys(dados) as (keyof ContentEditPatch)[];
  const registros = chavesAlteradas
    .map((k) => {
      const ehResp = (CAMPOS_RESP as readonly string[]).includes(k);
      const old = ehResp
        ? nomeDe(anterior[k])
        : anterior[k] == null
          ? "—"
          : String(anterior[k]);
      const nova = ehResp
        ? nomeDe(dados[k])
        : dados[k] == null
          ? "—"
          : String(dados[k]);
      return { field: ROTULO_CAMPO[k], old, new: nova };
    })
    .filter((r) => r.old !== r.new);
  if (registros.length > 0) await registrarHistorico(id, registros);

  revalidatePath("/conteudos");
  revalidatePath(`/conteudos/${id}`);
  return { ok: true, id };
}

// -------------------------------------------------------------
// Exclusão de conteúdos
// -------------------------------------------------------------

/** Exclui um conteúdo (histórico e comentários vão junto por cascade). */
export async function excluirConteudoAction(
  id: string,
  clientId?: string,
): Promise<ActionResult> {
  if (!(await usuarioAtualId())) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }
  // Remove evento/tarefa no Google antes de apagar (os ids somem por cascade).
  await removerGoogleDoConteudo(id);
  const supabase = createClient();
  const { error } = await supabase.from("contents").delete().eq("id", id);
  if (error) return { ok: false, error: "Não foi possível excluir o conteúdo." };

  revalidatePath("/conteudos");
  if (clientId) revalidatePath(`/clientes/${clientId}`);
  return { ok: true, id };
}

/**
 * Apaga todo o planejamento de um cliente num mês de referência
 * (exclui todos os conteúdos com aquele reference_month).
 */
export async function excluirPlanejamentoMesAction(
  clientId: string,
  referenceMonth: string,
): Promise<ActionResult> {
  if (!clientId || !/^\d{4}-\d{2}$/.test(referenceMonth)) {
    return { ok: false, error: "Dados inválidos." };
  }
  if (!(await usuarioAtualId())) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("contents")
    .delete()
    .eq("client_id", clientId)
    .eq("reference_month", referenceMonth);
  if (error) {
    return { ok: false, error: "Não foi possível apagar o planejamento." };
  }

  revalidatePath("/conteudos");
  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}

/**
 * Apaga TODOS os conteúdos de um cliente (todos os meses). Usado para limpar
 * o planejamento inteiro de um cliente de uma vez.
 */
export async function excluirTodosDoClienteAction(
  clientId: string,
): Promise<ActionResult> {
  if (!clientId) return { ok: false, error: "Cliente inválido." };
  if (!(await usuarioAtualId())) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("contents")
    .delete()
    .eq("client_id", clientId);
  if (error) {
    return { ok: false, error: "Não foi possível apagar os conteúdos." };
  }

  revalidatePath("/conteudos");
  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}
