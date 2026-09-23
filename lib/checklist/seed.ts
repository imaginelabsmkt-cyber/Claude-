import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types";
import { CHECKLIST_ONBOARD, CHECKLIST_PLANO } from "@/lib/checklist/defaults";

type SB = SupabaseClient<Database>;

/**
 * Cria os checklists padrão (onboard + plano) de um cliente, se ainda não
 * existirem. Melhor esforço: nunca quebra a criação do cliente.
 */
export async function semearChecklists(sb: SB, clientId: string): Promise<void> {
  try {
    const { data: existentes } = await sb
      .from("client_checklist_items")
      .select("id")
      .eq("client_id", clientId)
      .limit(1);
    if (existentes && existentes.length > 0) return;

    const linhas = [
      ...CHECKLIST_ONBOARD.map((label, i) => ({
        client_id: clientId,
        kind: "onboard",
        label,
        position: i,
      })),
      ...CHECKLIST_PLANO.map((label, i) => ({
        client_id: clientId,
        kind: "plano",
        label,
        position: i,
      })),
    ];
    await sb.from("client_checklist_items").insert(linhas);
  } catch (e) {
    console.error("semearChecklists:", e);
  }
}
