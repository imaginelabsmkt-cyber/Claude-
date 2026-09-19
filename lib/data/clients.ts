import { createClient } from "@/lib/supabase/server";
import { escaparLike } from "@/lib/utils";
import type { Client } from "@/types";

export type FiltroStatusCliente = "todos" | "ativos" | "inativos";

export interface ListarClientesParams {
  q?: string;
  status?: FiltroStatusCliente;
}

/** Cliente enriquecido com a quantidade de conteúdos cadastrados. */
export interface ClienteComContagem extends Client {
  contentsCount: number;
}

/**
 * Lista clientes com busca por nome e filtro por status, incluindo a
 * contagem de conteúdos de cada um. Ordenado por nome.
 */
export async function listarClientes(
  params: ListarClientesParams = {},
): Promise<ClienteComContagem[]> {
  const supabase = createClient();

  let query = supabase.from("clients").select("*").order("name", {
    ascending: true,
  });

  if (params.q && params.q.trim()) {
    query = query.ilike("name", `%${escaparLike(params.q.trim())}%`);
  }
  if (params.status === "ativos") query = query.eq("active", true);
  if (params.status === "inativos") query = query.eq("active", false);

  const { data: clientesTodos, error } = await query;
  if (error || !clientesTodos) return [];

  // A favie (cliente interno) não aparece na lista de Clientes.
  const clientes = clientesTodos.filter((c) => !c.is_internal);

  // Contagem de conteúdos por cliente (uma consulta só).
  const ids = clientes.map((c) => c.id);
  const contagem = new Map<string, number>();

  if (ids.length > 0) {
    const { data: conteudos } = await supabase
      .from("contents")
      .select("client_id")
      .in("client_id", ids);

    for (const linha of conteudos ?? []) {
      if (!linha.client_id) continue;
      contagem.set(linha.client_id, (contagem.get(linha.client_id) ?? 0) + 1);
    }
  }

  return clientes.map((c) => ({
    ...c,
    contentsCount: contagem.get(c.id) ?? 0,
  }));
}

/**
 * Ids dos clientes internos (favie). Resiliente: se a coluna ainda não existir
 * (migração não rodada), devolve [] em vez de quebrar a página.
 */
export async function listarIdsInternos(): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("clients")
    .select("id")
    .eq("is_internal", true);
  return (data ?? []).map((c) => c.id);
}

/** Obtém um cliente pelo id (ou null se não existir). */
export async function obterCliente(id: string): Promise<Client | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}

/**
 * Garante que existe o "cliente" interno da favie (conteúdo próprio) e o
 * devolve. Provisionado automaticamente na primeira vez — a pessoa nunca
 * cadastra isso. A favie fica escondida da lista de Clientes e das métricas.
 */
export async function garantirClienteFavie(): Promise<Client | null> {
  const supabase = createClient();
  const { data: existente } = await supabase
    .from("clients")
    .select("*")
    .eq("is_internal", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existente) return existente;

  const { data: novo } = await supabase
    .from("clients")
    .insert({
      name: "favie",
      active: true,
      is_internal: true,
      color: "#6a2336",
      niche: null,
      monthly_goal: null,
      notes: null,
    })
    .select("*")
    .single();
  return novo ?? null;
}
