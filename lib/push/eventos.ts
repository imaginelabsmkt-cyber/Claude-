import "server-only";
import { createClient } from "@/lib/supabase/server";
import { usuarioAtualId } from "@/lib/auth";
import { enviarPushParaUsuarios, type PushPayload } from "@/lib/push/send";

/**
 * Notificações "na hora" (event-driven). Melhor esforço: nunca lançam — devem
 * ser chamadas dentro de `aposResposta` para não travar a ação.
 *
 * Regra: nunca notifica quem fez a ação (você não é avisada do que você mesma
 * acabou de fazer).
 */

async function enviarExcluindoAtor(
  ids: string[],
  payload: PushPayload,
): Promise<void> {
  const unicos = [...new Set(ids.filter(Boolean))];
  if (unicos.length === 0) return;
  const sb = createClient();
  const ator = await usuarioAtualId();
  const alvo = unicos.filter((id) => id !== ator);
  if (alvo.length === 0) return;
  await enviarPushParaUsuarios(sb, alvo, payload);
}

/** Ids dos perfis de um papel (ex.: "planner" = Vitória). */
async function idsPorPapel(papel: string): Promise<string[]> {
  const sb = createClient();
  const { data } = await sb.from("profiles").select("id").eq("role", papel);
  return (data ?? []).map((p) => p.id);
}

/** Notifica o(s) Planejamento (Vitória). */
export async function notificarPlanner(payload: PushPayload): Promise<void> {
  try {
    await enviarExcluindoAtor(await idsPorPapel("planner"), payload);
  } catch {
    /* melhor esforço */
  }
}

/** Notifica usuários específicos (ex.: responsáveis por uma demanda). */
export async function notificarUsuarios(
  ids: string[],
  payload: PushPayload,
): Promise<void> {
  try {
    await enviarExcluindoAtor(ids, payload);
  } catch {
    /* melhor esforço */
  }
}

/** Notifica o Planejamento (Vitória) + os usuários dados, sem repetir. */
export async function notificarPlannerEUsuarios(
  ids: string[],
  payload: PushPayload,
): Promise<void> {
  try {
    const planners = await idsPorPapel("planner");
    await enviarExcluindoAtor([...planners, ...ids], payload);
  } catch {
    /* melhor esforço */
  }
}
