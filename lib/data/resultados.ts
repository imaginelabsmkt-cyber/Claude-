import { createClient } from "@/lib/supabase/server";
import type { ClientMonthlyResult } from "@/types";

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
