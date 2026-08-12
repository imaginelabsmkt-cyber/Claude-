import { createClient } from "@/lib/supabase/server";

export interface ConexaoGoogle {
  conectado: boolean;
  email: string | null;
}

/** Verifica se o usuário atual conectou o Google e com qual e-mail. */
export async function obterConexaoGoogle(): Promise<ConexaoGoogle> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { conectado: false, email: null };

  const { data } = await supabase
    .from("google_accounts")
    .select("email")
    .eq("user_id", user.id)
    .maybeSingle();

  return { conectado: Boolean(data), email: data?.email ?? null };
}
