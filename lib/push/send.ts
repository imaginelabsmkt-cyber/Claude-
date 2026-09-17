import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types";

type SB = SupabaseClient<Database>;

let configurado = false;

/** Configura o web-push com as chaves VAPID. Retorna false se não houver chaves. */
function configurar(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!configurado) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:imaginelabs.mkt@gmail.com",
      pub,
      priv,
    );
    configurado = true;
  }
  return true;
}

/** Há chaves configuradas? (para a UI decidir se oferece o recurso) */
export function pushDisponivel(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  );
}

export interface PushPayload {
  title: string;
  body: string;
  /** Rota aberta ao tocar na notificação (ex.: "/gravacoes"). */
  url?: string;
  /** Agrupa/atualiza notificações do mesmo tipo. */
  tag?: string;
}

/**
 * Envia uma notificação push para todos os dispositivos dos usuários dados.
 * Remove as inscrições que o navegador já descartou (410/404). Melhor esforço:
 * nunca lança — devolve quantas notificações saíram.
 */
export async function enviarPushParaUsuarios(
  sb: SB,
  userIds: string[],
  payload: PushPayload,
): Promise<number> {
  if (!configurar() || userIds.length === 0) return 0;

  const { data: subs } = await sb
    .from("push_subscriptions")
    .select("id, subscription")
    .in("user_id", userIds);
  if (!subs || subs.length === 0) return 0;

  const corpo = JSON.stringify(payload);
  const mortos: string[] = [];
  let enviados = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          s.subscription as unknown as webpush.PushSubscription,
          corpo,
        );
        enviados += 1;
      } catch (e) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) mortos.push(s.id); // expirou
      }
    }),
  );

  if (mortos.length > 0) {
    await sb.from("push_subscriptions").delete().in("id", mortos);
  }
  return enviados;
}

/** Atalho para um único usuário. */
export async function enviarPushParaUsuario(
  sb: SB,
  userId: string,
  payload: PushPayload,
): Promise<number> {
  return enviarPushParaUsuarios(sb, [userId], payload);
}
