import { createClient } from "@/lib/supabase/server";
import type { Content, ContentHistory, Comment, Profile } from "@/types";

export interface FiltrosConteudo {
  q?: string;
  client_id?: string;
  status?: string;
  priority?: string;
  format?: string;
  reference_month?: string;
  planned_week?: string;
}

export interface OpcaoCliente {
  id: string;
  name: string;
  color: string | null;
}

/**
 * Lista conteúdos aplicando filtros e busca por título.
 * Ordenado por data prevista (nulos por último) e depois por título.
 */
export async function listContents(
  filtros: FiltrosConteudo = {},
): Promise<Content[]> {
  const supabase = createClient();

  let query = supabase
    .from("contents")
    .select("*")
    .order("planned_date", { ascending: true, nullsFirst: false })
    .order("title", { ascending: true });

  if (filtros.q?.trim()) query = query.ilike("title", `%${filtros.q.trim()}%`);
  if (filtros.client_id) query = query.eq("client_id", filtros.client_id);
  if (filtros.status) query = query.eq("status", filtros.status);
  if (filtros.priority) query = query.eq("priority", filtros.priority);
  if (filtros.format) query = query.eq("format", filtros.format);
  if (filtros.reference_month)
    query = query.eq("reference_month", filtros.reference_month);
  if (filtros.planned_week)
    query = query.eq("planned_week", Number(filtros.planned_week));

  const { data, error } = await query;
  if (error || !data) return [];
  return data;
}

/** Obtém um conteúdo pelo id (ou null). */
export async function getContent(id: string): Promise<Content | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("contents")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}

/** Opções de clientes ativos (para selects e filtros). */
export async function listClientOptions(): Promise<OpcaoCliente[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name, color")
    .eq("active", true)
    .order("name", { ascending: true });
  return data ?? [];
}

/** Todos os clientes (id, nome, cor) — inclusive inativos, para exibição. */
export async function listAllClients(): Promise<OpcaoCliente[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name, color")
    .order("name", { ascending: true });
  return data ?? [];
}

/** Todos os perfis (responsáveis). */
export async function listProfiles(): Promise<Profile[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("name", { ascending: true });
  return data ?? [];
}

/** Meses de referência distintos já cadastrados (para o filtro de mês). */
export async function listReferenceMonths(): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("contents")
    .select("reference_month")
    .not("reference_month", "is", null);
  const meses = new Set<string>();
  for (const linha of data ?? []) {
    if (linha.reference_month) meses.add(linha.reference_month);
  }
  return Array.from(meses).sort().reverse();
}

/** Histórico de alterações de um conteúdo (mais recentes primeiro). */
export async function listHistorico(
  contentId: string,
): Promise<ContentHistory[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("content_history")
    .select("*")
    .eq("content_id", contentId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Comentários de um conteúdo (mais antigos primeiro). */
export async function listComentarios(contentId: string): Promise<Comment[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("comments")
    .select("*")
    .eq("content_id", contentId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

/** Índice auxiliar: mapa id->Profile e atalhos por papel. */
export function indexarPerfis(perfis: Profile[]) {
  const porId = new Map(perfis.map((p) => [p.id, p]));
  const planner = perfis.find((p) => p.role === "planner") ?? null;
  const producer = perfis.find((p) => p.role === "producer") ?? null;
  return { porId, planner, producer };
}
