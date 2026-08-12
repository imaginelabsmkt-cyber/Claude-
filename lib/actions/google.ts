"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { usuarioAtualId } from "@/lib/auth";
import {
  sincronizarGravacao,
  sincronizarPostagem,
} from "@/lib/google/sync";
import { sincronizarPlanejamentoGoogle } from "@/lib/google/planning-sync";
import type { ActionResult } from "@/lib/actions/contents";

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
 * Reenvia TUDO ao Google, recriando no calendário certo:
 * - Reuniões e prazos dos planejamentos (cria a agenda "Imagine Reuniões").
 * - Postagens e gravações dos conteúdos (atualiza títulos com cliente, etc.).
 * Limpa os vínculos antigos para recriar nos calendários novos.
 */
export async function reenviarTudoGoogleAction(): Promise<
  ActionResult & { planejamentos?: number; conteudos?: number }
> {
  const userId = await usuarioAtualId();
  if (!userId) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const supabase = createClient();

  // Limpa todos os mapeamentos para forçar recriar nos calendários certos.
  await supabase.from("google_sync").delete().eq("user_id", userId);
  await supabase.from("planning_google_sync").delete().eq("user_id", userId);

  // Planejamentos com reunião ou prazo.
  const { data: ps } = await supabase
    .from("plannings")
    .select("id, meeting_date, delivery_deadline");
  const planej = (ps ?? []).filter(
    (p) => p.meeting_date || p.delivery_deadline,
  );
  for (const p of planej) await sincronizarPlanejamentoGoogle(p.id);

  // Conteúdos com data de postagem ou de gravação (não cancelados).
  const { data: cs } = await supabase
    .from("contents")
    .select("id, planned_date, recording_date, status")
    .neq("status", "Cancelado");
  const conts = (cs ?? []).filter(
    (c) => c.planned_date || c.recording_date,
  );
  for (const c of conts) {
    if (c.planned_date) await sincronizarPostagem(c.id);
    if (c.recording_date) await sincronizarGravacao(c.id);
  }

  revalidatePath("/configuracoes");
  return { ok: true, planejamentos: planej.length, conteudos: conts.length };
}
