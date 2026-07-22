import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

export interface AuthContext {
  /** Usuário do Supabase Auth (ou null se não autenticado). */
  user: { id: string; email: string | null } | null;
  /** Perfil correspondente na tabela profiles (ou null). */
  profile: Profile | null;
}

/**
 * Obtém, no servidor, o usuário autenticado e seu perfil (tabela profiles).
 * Usado pelo layout autenticado. Não redireciona — apenas lê o estado.
 */
export async function getAuthContext(): Promise<AuthContext> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return {
    user: { id: user.id, email: user.email ?? null },
    profile: (profile as Profile | null) ?? null,
  };
}

/**
 * Nome de exibição do usuário: usa o nome do profile e cai para o e-mail.
 */
export function displayName(ctx: AuthContext): string {
  return ctx.profile?.name ?? ctx.user?.email ?? "Usuário";
}

/**
 * Garante que há um usuário autenticado (defesa em profundidade nas server
 * actions, além do RLS). Retorna o id ou null se não houver sessão.
 */
export async function usuarioAtualId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
