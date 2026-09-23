import { createClient } from "@/lib/supabase/server";
import type { ClientMonthlyResult } from "@/types";

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
