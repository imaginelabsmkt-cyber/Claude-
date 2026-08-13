import { createClient } from "@/lib/supabase/server";
import type { ClientReport } from "@/types";

/** DNA/onboarding do cliente (mapa campo->valor). Vazio se ainda não existe. */
export async function getOnboarding(
  clientId: string,
): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("client_onboarding")
    .select("data")
    .eq("client_id", clientId)
    .maybeSingle();
  return (data?.data as Record<string, string> | undefined) ?? {};
}

/** Relatórios do cliente (mais recentes primeiro). */
export async function listClientReports(
  clientId: string,
): Promise<ClientReport[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("client_reports")
    .select("*")
    .eq("client_id", clientId)
    .order("reference_month", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  return data ?? [];
}
