import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarPushParaUsuario } from "@/lib/push/send";

type SB = SupabaseClient<Database>;

/**
 * Marca a conexão do Google como CAÍDA (token revogado/expirado) em vez de
 * apagar a conta, assim o sistema lembra que a pessoa precisa reconectar e
 * mostra o aviso. Notifica a dona da conexão E a coordenação (uma única vez,
 * não repete a cada tentativa de sincronizar). Melhor esforço.
 *
 * Usa a service role: a sincronização pode ter sido disparada por OUTRA pessoa
 * (ex.: a Vitória agendando, mas a conta conectada é da Fran). Sem a service
 * role, essa pessoa não teria permissão pra marcar a conta caída nem avisar os
 * outros, e o aviso nunca apareceria.
 */
export async function marcarGoogleRevogado(
  sb: SB,
  userId: string,
): Promise<void> {
  try {
    const admin = createAdminClient() ?? sb;

    const { data } = await admin
      .from("google_accounts")
      .select("revoked_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (!data || data.revoked_at) return; // inexistente ou já marcada

    await admin
      .from("google_accounts")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", userId);

    // Avisa quem precisa reconectar: a dona da conexão + a coordenação.
    const { data: coord } = await admin
      .from("profiles")
      .select("id")
      .in("role", ["admin", "producer", "planner"]);
    const alvos = new Set<string>([
      userId,
      ...(coord ?? []).map((p) => p.id),
    ]);
    for (const id of alvos) {
      await enviarPushParaUsuario(admin, id, {
        title: "⚠️ Google Agenda desconectou",
        body: "A sincronização parou. Toque para reconectar.",
        url: "/configuracoes",
        tag: "google-desconectou",
      });
    }
  } catch {
    /* melhor esforço, nunca quebra a sincronização */
  }
}
