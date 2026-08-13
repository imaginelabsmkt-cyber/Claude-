import { createClient } from "@/lib/supabase/server";
import type { ClientFile } from "@/types";

/** Arquivos de um cliente (mais recentes primeiro). */
export async function listClientFiles(clientId: string): Promise<ClientFile[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("client_files")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
