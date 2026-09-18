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

  const { data: clientes, error } = await query;
  if (error || !clientes) return [];

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
