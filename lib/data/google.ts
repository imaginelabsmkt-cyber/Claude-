import { createClient } from "@/lib/supabase/server";

export interface ConexaoGoogle {
  conectado: boolean;
  email: string | null;
  /** Conectou antes, mas a conexão caiu (token revogado/expirado): reconectar. */
  revogado: boolean;
}

/** Verifica se o usuário atual conectou o Google e com qual e-mail. */
export async function obterConexaoGoogle(): Promise<ConexaoGoogle> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { conectado: false, email: null, revogado: false };

  const { data } = await supabase
    .from("google_accounts")
    .select("email, revoked_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const revogado = Boolean(data?.revoked_at);
  return {
    conectado: Boolean(data) && !revogado,
    email: data?.email ?? null,
    revogado,
  };
}
