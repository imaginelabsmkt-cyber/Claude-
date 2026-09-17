"use server";

import { createClient } from "@/lib/supabase/server";
import { usuarioAtualId } from "@/lib/auth";
import {
  enviarPushParaUsuario,
  pushDisponivel,
  type PushPayload,
} from "@/lib/push/send";

export interface PushResult {
  ok: boolean;
  error?: string;
}

/** Guarda (ou atualiza) a inscrição push deste dispositivo para o usuário. */
export async function salvarInscricaoPushAction(input: {
  endpoint: string;
  subscription: Record<string, unknown>;
  userAgent?: string | null;
}): Promise<PushResult> {
  const userId = await usuarioAtualId();
  if (!userId) return { ok: false, error: "Sessão expirada. Entre novamente." };
  if (!input?.endpoint || !input?.subscription) {
    return { ok: false, error: "Inscrição inválida." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: input.endpoint,
      subscription: input.subscription,
      user_agent: input.userAgent ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );
  if (error) return { ok: false, error: "Não foi possível ativar." };
  return { ok: true };
}

/** Remove a inscrição deste dispositivo (desativar no aparelho atual). */
export async function removerInscricaoPushAction(
  endpoint: string,
): Promise<PushResult> {
  if (!(await usuarioAtualId())) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }
  if (!endpoint) return { ok: false, error: "Inscrição inválida." };
  const supabase = createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { ok: true };
}

/** Dispara uma notificação de teste para o próprio usuário. */
export async function enviarPushTesteAction(): Promise<PushResult> {
  const userId = await usuarioAtualId();
  if (!userId) return { ok: false, error: "Sessão expirada. Entre novamente." };
  if (!pushDisponivel()) {
    return { ok: false, error: "Notificações ainda não configuradas no servidor." };
  }
  const supabase = createClient();
  const payload: PushPayload = {
    title: "favie",
    body: "🎉 Notificações ativadas! É assim que você vai ser avisada.",
    url: "/dashboard",
    tag: "teste",
  };
  const n = await enviarPushParaUsuario(supabase, userId, payload);
  if (n === 0) {
    return {
      ok: false,
      error: "Nenhum dispositivo recebeu. Ative a notificação neste aparelho.",
    };
  }
  return { ok: true };
}
