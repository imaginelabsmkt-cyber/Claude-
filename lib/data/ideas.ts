import { createClient } from "@/lib/supabase/server";
import type { ContentIdea } from "@/types";

/** Ideias ativas (não arquivadas e não produzidas) de um espaço, por data. */
export async function listarIdeias(clientId: string): Promise<ContentIdea[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("content_ideas")
    .select("*")
    .eq("client_id", clientId)
    .is("archived_at", null)
    .is("promoted_content_id", null)
    .order("created_at", { ascending: false });
  return data ?? [];
}
