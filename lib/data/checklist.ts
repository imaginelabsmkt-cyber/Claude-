import { createClient } from "@/lib/supabase/server";
import type { ClientChecklistItem } from "@/types";
import type { ChecklistKind } from "@/lib/checklist/defaults";

/** Itens do checklist do cliente para um tipo (onboard/plano), em ordem. */
export async function listChecklist(
  clientId: string,
  kind: ChecklistKind,
): Promise<ClientChecklistItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("client_checklist_items")
    .select("*")
    .eq("client_id", clientId)
    .eq("kind", kind)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  return data ?? [];
}
