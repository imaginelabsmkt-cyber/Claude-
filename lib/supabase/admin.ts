import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types";

/**
 * Cliente Supabase com a SERVICE ROLE (ignora RLS). Uso EXCLUSIVO no servidor,
 * em rotinas sem usuário logado, hoje: o cron que envia as notificações push,
 * que precisa ler as inscrições e os dados de todo mundo.
 *
 * NUNCA importe isto em componente de cliente. Retorna null se a chave não
 * estiver configurada, para não quebrar build/preview.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
