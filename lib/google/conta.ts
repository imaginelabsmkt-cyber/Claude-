import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types";
import { enviarPushParaUsuario } from "@/lib/push/send";

type SB = SupabaseClient<Database>;

/**
 * Marca a conexão do Google como CAÍDA (token revogado/expirado) em vez de
 * apagar a conta — assim o sistema lembra que a pessoa precisa reconectar e
 * mostra o aviso. Notifica a pessoa uma única vez (não repete a cada tentativa
 * de sincronizar). Melhor esforço.
 */
export async function marcarGoogleRevogado(
  sb: SB,
  userId: string,
): Promise<void> {
  try {
    const { data } = await sb
      .from("google_accounts")
      .select("revoked_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (!data || data.revoked_at) return; // inexistente ou já marcada

    await sb
      .from("google_accounts")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", userId);

    await enviarPushParaUsuario(sb, userId, {
      title: "⚠️ Google Agenda desconectou",
      body: "Toque para reconectar e voltar a sincronizar.",
      url: "/configuracoes",
      tag: "google-desconectou",
    });
  } catch {
    /* melhor esforço — nunca quebra a sincronização */
  }
}
