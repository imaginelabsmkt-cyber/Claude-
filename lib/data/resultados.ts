import { createClient } from "@/lib/supabase/server";
import type { ClientMonthlyResult } from "@/types";

export interface RespostaSemana {
  client_id: string;
  closed_count: number | null;
  closed_traffic: number | null;
  closed_organic: number | null;
  sources: string | null;
  sources_breakdown: Record<string, number> | null;
  client_comment: string | null;
  client_updated_at: string | null;
}

/**
 * Respostas que os CLIENTES enviaram pelo painel numa semana (os que já
 * responderam). Pra equipe/gestora de tráfego ver tudo de uma vez e analisar.
 */
export async function listarRespostasSemana(
  weekStart: string,
): Promise<RespostaSemana[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("client_monthly_results")
    .select(
      "client_id, closed_count, closed_traffic, closed_organic, sources, sources_breakdown, client_comment, client_updated_at",
    )
    .eq("week_start", weekStart)
    .not("client_updated_at", "is", null)
    .order("client_updated_at", { ascending: false });
  return (data as RespostaSemana[] | null) ?? [];
}

/** Resultado da semana (tráfego + retorno do cliente) para a equipe editar. */
export async function obterResultadoSemana(
  clientId: string,
  weekStart: string,
): Promise<ClientMonthlyResult | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("client_monthly_results")
    .select("*")
    .eq("client_id", clientId)
    .eq("week_start", weekStart)
    .maybeSingle();
  return data ?? null;
}
