"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { usuarioAtualId } from "@/lib/auth";
import { renovarAccessToken } from "@/lib/google/oauth";
import { calendarioId, type CalendarioKind } from "@/lib/google/calendars";
import {
  sincronizarGravacao,
  sincronizarGravacaoEmLote,
  sincronizarPostagem,
} from "@/lib/google/sync";
import { sincronizarPlanejamentoGoogle } from "@/lib/google/planning-sync";
import { estaGravado } from "@/lib/rules/contents";
import type { ActionResult } from "@/lib/actions/contents";

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Apaga UM evento com retentativa. O Google bloqueia por excesso de
 * velocidade (403/429) quando são muitos: nesse caso espera e tenta de novo,
 * até conseguir de verdade. 404/410 = já não existe (sucesso).
 */
async function apagarEventoComRetry(
  token: string,
  cal: string,
  eventId: string,
): Promise<boolean> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${cal}/events/${eventId}?sendUpdates=none`;
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    try {
      const r = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok || r.status === 404 || r.status === 410) return true;
      // Bloqueio por limite (403/429) ou erro do servidor (5xx): espera e repete.
      if (r.status === 403 || r.status === 429 || r.status >= 500) {
        await dormir(500 * (tentativa + 1));
        continue;
      }
      return false; // erro definitivo (não adianta repetir)
    } catch {
      await dormir(500 * (tentativa + 1));
    }
  }
  return false;
}

/**
 * Apaga TODOS os eventos de um calendário Imagine (limpa duplicados).
 * Vai em blocos pequenos (para não estourar o limite do Google) e SÓ termina
 * quando o calendário está realmente vazio — assim não sobra duplicado.
 */
async function limparCalendario(
  token: string,
  calId: string,
): Promise<void> {
  const cal = encodeURIComponent(calId);
  const LOTE = 8; // quantos apagar em paralelo (devagar, sem estourar o limite)
  // Repete a varredura até não sobrar nenhum evento (no máx. algumas rodadas).
  for (let rodada = 0; rodada < 40; rodada++) {
    const resp = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${cal}/events?maxResults=250&showDeleted=false`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!resp.ok) return;
    const j = (await resp.json()) as { items?: { id: string }[] };
    const ids = (j.items ?? []).map((ev) => ev.id);
    if (ids.length === 0) return; // vazio: terminou
    for (let i = 0; i < ids.length; i += LOTE) {
      const bloco = ids.slice(i, i + LOTE);
      await Promise.all(
        bloco.map((id) => apagarEventoComRetry(token, cal, id)),
      );
    }
  }
}

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
 * Reenvia TUDO ao Google de forma IDEMPOTENTE (pode clicar quantas vezes
 * quiser, nunca duplica): apaga todos os eventos dos calendários Imagine e
 * recria do zero. Reuniões => Imagine Reuniões, gravações/fotos => Imagine
 * Produção, postagens => Imagine Postagens. Gravações do mesmo cliente na
 * mesma data/hora viram um evento só (lote).
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

  // 1) Apaga TODOS os eventos dos 3 calendários Imagine (limpa duplicados).
  const kinds: CalendarioKind[] = ["reunioes", "producao", "postagens"];
  for (const k of kinds) {
    const calId = await calendarioId(supabase, userId, token, k);
    await limparCalendario(token, calId);
  }

  // 2) Limpa os vínculos de EVENTOS (mantém tarefas para não duplicar tarefa).
  await supabase
    .from("google_sync")
    .delete()
    .eq("user_id", userId)
    .in("kind", ["event", "post"]);
  await supabase
    .from("planning_google_sync")
    .delete()
    .eq("user_id", userId)
    .eq("kind", "event");

  // 3) Recria reuniões (e atualiza a tarefa de entrega, sem duplicar).
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
    // Só cria evento de gravação para o que AINDA vai gravar (não o já gravado).
    if (!c.recording_date || estaGravado(c.status)) continue;
    const chave = `${c.client_id}|${c.recording_date}|${c.recording_time ?? ""}`;
    grupos.set(chave, [...(grupos.get(chave) ?? []), c.id]);
  }
  for (const ids of grupos.values()) {
    if (ids.length > 1) await sincronizarGravacaoEmLote(ids);
    else await sincronizarGravacao(ids[0]);
  }

  revalidatePath("/configuracoes");
  return { ok: true, planejamentos: planej.length, conteudos: conts.length };
}
