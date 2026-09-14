import { createClient } from "@/lib/supabase/server";
import type { ContentStatus } from "@/types";

export interface SearchClient {
  id: string;
  name: string;
  active: boolean;
  color: string | null;
  niche: string | null;
}
export interface SearchContent {
  id: string;
  title: string;
  status: ContentStatus;
  format: string | null;
  client_id: string;
}

/**
 * Índice leve para a busca global: só os campos necessários de clientes e
 * conteúdos (capas ficam de fora — não são conteúdo). A filtragem em si é
 * feita no cliente, conforme a pessoa digita.
 */
export async function listSearchIndex(): Promise<{
  clients: SearchClient[];
  contents: SearchContent[];
}> {
  const supabase = createClient();
  const [clientesRes, conteudosRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, active, color, niche")
      .order("name", { ascending: true }),
    supabase
      .from("contents")
      .select("id, title, status, format, client_id")
      .is("cover_source_id", null)
      .order("updated_at", { ascending: false }),
  ]);
  return {
    clients: (clientesRes.data as SearchClient[] | null) ?? [],
    contents: (conteudosRes.data as SearchContent[] | null) ?? [],
  };
}
