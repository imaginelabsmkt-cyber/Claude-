import { createClient } from "@/lib/supabase/server";

export interface ConexaoGoogle {
  conectado: boolean;
  email: string | null;
  /** Conectou antes, mas a conexão caiu (token revogado/expirado): reconectar. */
  revogado: boolean;
  /** Permissões efetivamente concedidas (lidas do escopo guardado). */
  temAgenda: boolean;
  temTarefas: boolean;
  temPlanilhas: boolean;
  temDrive: boolean;
}

/**
 * Verifica se o usuário conectou o Google e com qual e-mail. Se o `userId` já
 * for conhecido (ex.: o layout já carregou), passe-o para evitar uma ida à rede.
 */
export async function obterConexaoGoogle(
  userId?: string,
): Promise<ConexaoGoogle> {
  const supabase = createClient();
  let uid = userId;
  if (!uid) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    uid = session?.user?.id;
  }
  if (!uid)
    return {
      conectado: false,
      email: null,
      revogado: false,
      temAgenda: false,
      temTarefas: false,
      temPlanilhas: false,
      temDrive: false,
    };

  const { data } = await supabase
    .from("google_accounts")
    .select("email, revoked_at, scope")
    .eq("user_id", uid)
    .maybeSingle();

  const revogado = Boolean(data?.revoked_at);
  const scope = data?.scope ?? "";
  const tem = (s: string) => scope.includes(s);
  return {
    conectado: Boolean(data) && !revogado,
    email: data?.email ?? null,
    revogado,
    temAgenda: tem("/auth/calendar"),
    temTarefas: tem("/auth/tasks"),
    temPlanilhas: tem("/auth/spreadsheets"),
    temDrive: tem("/auth/drive"),
  };
}
