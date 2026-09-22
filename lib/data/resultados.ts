import { createClient } from "@/lib/supabase/server";
import type { ClientMonthlyResult } from "@/types";

export interface NotaSemanal {
  note: string | null;
  filePath: string | null;
  fileName: string | null;
}

/** Recado/relatório da semana (para a equipe editar). */
export async function obterNotaSemanal(
  clientId: string,
  weekStart: string,
): Promise<NotaSemanal> {
  const supabase = createClient();
  const { data } = await supabase
    .from("client_weekly_notes")
    .select("note, file_path, file_name")
    .eq("client_id", clientId)
    .eq("week_start", weekStart)
    .maybeSingle();
  return {
    note: data?.note ?? null,
    filePath: data?.file_path ?? null,
    fileName: data?.file_name ?? null,
  };
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
