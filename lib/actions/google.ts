"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { usuarioAtualId } from "@/lib/auth";
import { renovarAccessToken } from "@/lib/google/oauth";
import {
  sincronizarGravacao,
  sincronizarGravacaoEmLote,
  sincronizarPostagem,
  sincronizarEdicao,
} from "@/lib/google/sync";
import { sincronizarPlanejamentoGoogle } from "@/lib/google/planning-sync";
import type { ActionResult } from "@/lib/actions/contents";
import type { ContentStatus } from "@/types";

/** Status em que o vídeo está na fila/edição (viram tarefa + bloco na Agenda). */
const STATUS_EDICAO_REENVIO: ContentStatus[] = [
  "Fila de edição",
  "Em edição",
  "Ajustes",
];

/** Remove a conexão do usuário com o Google (e o mapeamento de sincronização). */
export async function desconectarGoogleAction(): Promise<ActionResult> {
  const userId = await usuarioAtualId();
  if (!userId) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const supabase = createClient();
  await supabase.from("google_sync").delete().eq("user_id", userId);
  const { error } = await supabase
    .from("google_accounts")
    .delete()
    .eq("user_id", userId);
  if (error) return { ok: false, error: "Não foi possível desconectar." };

  revalidatePath("/configuracoes");
  return { ok: true };
}

/**
 * Reenvia TUDO ao Google SEM APAGAR nada: só atualiza (ou cria o que está
 * faltando) o que o app controla, usando os vínculos de sincronização — então
 * NUNCA remove eventos criados à mão pela pessoa. Reuniões => Imagine Reuniões,
 * gravações/fotos => Imagine Produção, postagens => Imagine Postagens.
 * Idempotente: pode clicar quantas vezes quiser. Inclui também as gravações que
 * JÁ aconteceram (ficam de registro histórico na agenda).
 */
export async function reenviarTudoGoogleAction(): Promise<
  ActionResult & { planejamentos?: number; conteudos?: number }
> {
  const userId = await usuarioAtualId();
  if (!userId) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const supabase = createClient();
  const { data: acc } = await supabase
    .from("google_accounts")
    .select("refresh_token")
    .eq("user_id", userId)
    .maybeSingle();
  if (!acc?.refresh_token) {
    return { ok: false, error: "Conecte o Google primeiro (Configurações)." };
  }
  let token: string;
  try {
    token = await renovarAccessToken(acc.refresh_token);
  } catch {
    return { ok: false, error: "Reconecte o Google e tente de novo." };
  }

  // Não apaga nada: os vínculos de sincronização são mantidos, então cada
  // item é ATUALIZADO no evento que já existe (ou criado se faltar). Eventos
  // que a pessoa criou à mão nos calendários Imagine ficam intocados.

  // Atualiza/cria reuniões (e a tarefa de entrega).
  const { data: ps } = await supabase
    .from("plannings")
    .select("id, meeting_date, delivery_deadline");
  const planej = (ps ?? []).filter((p) => p.meeting_date || p.delivery_deadline);
  for (const p of planej) await sincronizarPlanejamentoGoogle(p.id);

  // 4) Recria postagens e gravações (gravações agrupadas viram evento único).
  const { data: cs } = await supabase
    .from("contents")
    .select("id, planned_date, recording_date, recording_time, client_id, status")
    .neq("status", "Cancelado");
  const conts = cs ?? [];

  for (const c of conts) {
    if (c.planned_date) await sincronizarPostagem(c.id);
  }

  const grupos = new Map<string, string[]>();
  for (const c of conts) {
    // Toda gravação com data vira evento — inclusive as que JÁ aconteceram
    // (ficam de registro na agenda). Sem data, não há o que registrar.
    if (!c.recording_date) continue;
    const chave = `${c.client_id}|${c.recording_date}|${c.recording_time ?? ""}`;
    grupos.set(chave, [...(grupos.get(chave) ?? []), c.id]);
  }
  for (const ids of grupos.values()) {
    if (ids.length > 1) await sincronizarGravacaoEmLote(ids);
    else await sincronizarGravacao(ids[0]);
  }

  // 5) Recria as EDIÇÕES como TAREFA (to-do) no Google — nunca como evento.
  for (const c of conts) {
    if (!STATUS_EDICAO_REENVIO.includes(c.status as ContentStatus)) continue;
    await sincronizarEdicao(c.id, c.status as ContentStatus);
  }

  revalidatePath("/configuracoes");
  return { ok: true, planejamentos: planej.length, conteudos: conts.length };
}
