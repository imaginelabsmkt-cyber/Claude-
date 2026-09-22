import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

export interface AuthContext {
  /** Usuário do Supabase Auth (ou null se não autenticado). */
  user: { id: string; email: string | null } | null;
  /** Perfil correspondente na tabela profiles (ou null). */
  profile: Profile | null;
  /**
   * A conta está liberada? Estar autenticado NÃO basta: a chave "anon"
   * do Supabase é pública, então qualquer pessoa consegue criar conta.
   * Só conta liberada enxerga dado — o banco garante isso por RLS, e
   * aqui a gente evita mostrar uma tela vazia e confusa.
   */
  approved: boolean;
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
    return { user: null, profile: null, approved: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const perfil = (profile as Profile | null) ?? null;

  return {
    user: { id: user.id, email: user.email ?? null },
    profile: perfil,
    approved: perfil?.approved ?? false,
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
