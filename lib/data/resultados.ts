import { createClient } from "@/lib/supabase/server";
import type { ClientMonthlyResult } from "@/types";

/** Recado/relatório da semana (para a equipe editar). */
export async function obterNotaSemanal(
  clientId: string,
  weekStart: string,
): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("client_weekly_notes")
    .select("note")
    .eq("client_id", clientId)
    .eq("week_start", weekStart)
    .maybeSingle();
  return data?.note ?? null;
}

/** Resultado do mês (tráfego + retorno do cliente) para a equipe editar. */
export async function obterResultadoMes(
  clientId: string,
  month: string,
): Promise<ClientMonthlyResult | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("client_monthly_results")
    .select("*")
    .eq("client_id", clientId)
    .eq("month", month)
    .maybeSingle();
  return data ?? null;
}
