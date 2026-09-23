import { createClient } from "@/lib/supabase/server";
import type { ActionPlanItem } from "@/types";

/** Estratégias do plano de ação do cliente (não arquivadas), em ordem. */
export async function listActionPlan(
  clientId: string,
): Promise<ActionPlanItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("action_plan_items")
    .select("*")
    .eq("client_id", clientId)
    .is("archived_at", null)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  return data ?? [];
}
