import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types";

/**
 * Cliente Supabase com a chave service_role. USO EXCLUSIVO no servidor,
 * em rotas de automação (cron) que rodam sem sessão de usuário e, por isso,
 * não passam pelas políticas RLS de "authenticated".
 *
 * NUNCA importe este módulo em código que vá para o navegador. A chave
 * service_role ignora RLS e jamais pode ser exposta no cliente.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias para a automação.",
    );
  }
  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
