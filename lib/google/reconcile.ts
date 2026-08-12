/**
 * Dois sentidos (Google -> sistema), por polling leve.
 * Quando o usuário CONCLUI no Google a tarefa de edição, o conteúdo avança
 * para "Revisão interna" automaticamente.
 *
 * Como o Google Tarefas não tem webhook e a Vercel Hobby não permite cron
 * frequente, isto roda quando o usuário abre o app — com um "freio" de 2 min
 * (via updated_at) para não consultar o Google a cada clique.
 */
import { createClient } from "@/lib/supabase/server";
import { usuarioAtualId } from "@/lib/auth";
import { renovarAccessToken } from "@/lib/google/oauth";
import { registrarHistorico } from "@/lib/history";
import type { ContentStatus } from "@/types";

const STATUS_EDICAO: ContentStatus[] = [
  "Fila de edição",
  "Em edição",
  "Ajustes",
];
const INTERVALO_MS = 2 * 60 * 1000; // 2 minutos

export async function reconciliarTarefasGoogle(): Promise<void> {
  try {
    const userId = await usuarioAtualId();
    if (!userId) return;
    const sb = createClient();

    const { data: conta } = await sb
      .from("google_accounts")
      .select("refresh_token, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (!conta?.refresh_token) return;

    // Freio: só consulta o Google no máximo a cada INTERVALO_MS.
    const ultimo = conta.updated_at ? new Date(conta.updated_at).getTime() : 0;
    if (Date.now() - ultimo < INTERVALO_MS) return;
    await sb
      .from("google_accounts")
      .update({ updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    let token: string | null = null;
    try {
      token = await renovarAccessToken(conta.refresh_token);
    } catch {
      return;
    }

    const { data: syncs } = await sb
      .from("google_sync")
      .select("content_id, external_id")
      .eq("user_id", userId)
      .eq("kind", "task");
    if (!syncs || syncs.length === 0) return;

    const resp = await fetch(
      "https://www.googleapis.com/tasks/v1/lists/@default/tasks?showCompleted=true&showHidden=true&maxResults=100",
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!resp.ok) return;
    const json = (await resp.json()) as {
      items?: { id: string; status: string }[];
    };
    const statusPorId = new Map(
      (json.items ?? []).map((t) => [t.id, t.status]),
    );

    for (const s of syncs) {
      if (statusPorId.get(s.external_id) !== "completed") continue;

      const { data: c } = await sb
        .from("contents")
        .select("status")
        .eq("id", s.content_id)
        .maybeSingle();

      // Conteúdo já saiu da edição? só limpa o mapeamento obsoleto.
      if (!c || !STATUS_EDICAO.includes(c.status)) {
        await sb
          .from("google_sync")
          .delete()
          .eq("content_id", s.content_id)
          .eq("user_id", userId)
          .eq("kind", "task");
        continue;
      }

      // Edição concluída no Google => avança para Revisão interna.
      await sb
        .from("contents")
        .update({ status: "Revisão interna", editing_queue_position: null })
        .eq("id", s.content_id);
      await registrarHistorico(s.content_id, [
        { field: "Status", old: c.status, new: "Revisão interna" },
      ]);

      await fetch(
        `https://www.googleapis.com/tasks/v1/lists/@default/tasks/${s.external_id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      );
      await sb
        .from("google_sync")
        .delete()
        .eq("content_id", s.content_id)
        .eq("user_id", userId)
        .eq("kind", "task");
    }

    // ---- EVENTOS: se a produção foi movida no Google, atualiza aqui ----
    const { data: eventos } = await sb
      .from("google_sync")
      .select("content_id, external_id")
      .eq("user_id", userId)
      .eq("kind", "event");

    for (const ev of eventos ?? []) {
      const r = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${ev.external_id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!r.ok) continue;
      const evento = (await r.json()) as {
        status?: string;
        start?: { date?: string; dateTime?: string };
      };
      if (evento.status === "cancelled") continue; // não apaga a gravação aqui

      // Extrai data (YYYY-MM-DD) e hora (HH:MM) do evento no Google.
      let novaData: string | null = null;
      let novaHora: string | null = null;
      if (evento.start?.dateTime) {
        novaData = evento.start.dateTime.slice(0, 10);
        novaHora = evento.start.dateTime.slice(11, 16);
      } else if (evento.start?.date) {
        novaData = evento.start.date;
        novaHora = null;
      }
      if (!novaData) continue;

      const { data: c } = await sb
        .from("contents")
        .select("recording_date, recording_time")
        .eq("id", ev.content_id)
        .maybeSingle();
      if (!c) continue;

      const mudou =
        c.recording_date !== novaData ||
        (c.recording_time ?? null) !== (novaHora ?? null);
      if (!mudou) continue;

      await sb
        .from("contents")
        .update({ recording_date: novaData, recording_time: novaHora })
        .eq("id", ev.content_id);
      await registrarHistorico(ev.content_id, [
        {
          field: "Data de gravação",
          old: c.recording_date ?? "—",
          new: novaData,
        },
      ]);
    }
  } catch (e) {
    console.error("reconciliarTarefasGoogle:", e);
  }
}
