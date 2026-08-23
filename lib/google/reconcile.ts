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
import { renovarAccessToken, GoogleRevogadoError } from "@/lib/google/oauth";
import { calendarioId } from "@/lib/google/calendars";
import { criarCapaDoVideo } from "@/lib/content/covers";
import { sincronizarSessaoEdicao } from "@/lib/google/sync";
import { registrarHistorico } from "@/lib/history";
import type { ContentStatus } from "@/types";

const TZ = "America/Boa_Vista";

/** Extrai data (YYYY-MM-DD) e hora (HH:MM) no fuso de SP a partir do evento. */
function dataHoraLocal(start: {
  date?: string;
  dateTime?: string;
}): { data: string | null; hora: string | null } {
  if (start.date) return { data: start.date, hora: null };
  if (!start.dateTime) return { data: null, hora: null };
  const d = new Date(start.dateTime);
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  return {
    data: `${get("year")}-${get("month")}-${get("day")}`,
    hora: `${get("hour")}:${get("minute")}`,
  };
}

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

    // Freio ATÔMICO: só uma execução por vez a cada INTERVALO_MS. O UPDATE
    // condicional (updated_at antigo) evita corrida entre abas/prefetch —
    // apenas quem alterar a linha segue adiante.
    const limite = new Date(Date.now() - INTERVALO_MS).toISOString();
    const { data: marcado } = await sb
      .from("google_accounts")
      .update({ updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .lt("updated_at", limite)
      .select("refresh_token");
    const refresh = marcado?.[0]?.refresh_token;
    if (!refresh) return; // não conectado, ou já rodou há < INTERVALO_MS

    let token: string | null = null;
    try {
      token = await renovarAccessToken(refresh);
    } catch (e) {
      if (e instanceof GoogleRevogadoError) {
        await sb.from("google_accounts").delete().eq("user_id", userId);
      }
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
      // Vídeo editado => gera a demanda de capa (arte).
      await criarCapaDoVideo(sb, s.content_id);

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

    // Gravações vivem no calendário "Imagine Produção".
    const calProd = encodeURIComponent(
      await calendarioId(sb, userId, token, "producao"),
    );

    // Busca todos os eventos em paralelo (não em série).
    await Promise.all(
      (eventos ?? []).map(async (ev) => {
        const r = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calProd}/events/${ev.external_id}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        // Evento apagado à mão no Google: limpa o mapeamento.
        if (r.status === 404) {
          await sb
            .from("google_sync")
            .delete()
            .eq("content_id", ev.content_id)
            .eq("user_id", userId)
            .eq("kind", "event");
          return;
        }
        if (!r.ok) return;
        const evento = (await r.json()) as {
          status?: string;
          start?: { date?: string; dateTime?: string };
        };
        if (evento.status === "cancelled" || !evento.start) return;

        const { data: novaData, hora: novaHora } = dataHoraLocal(evento.start);
        if (!novaData) return;

        const { data: c } = await sb
          .from("contents")
          .select("recording_date, recording_time")
          .eq("id", ev.content_id)
          .maybeSingle();
        if (!c) return;

        const mudou =
          c.recording_date !== novaData ||
          (c.recording_time ?? null) !== (novaHora ?? null);
        if (!mudou) return;

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
      }),
    );

    // ---- BLOCOS DE EDIÇÃO faltantes: cria na Agenda o que ficou pra trás ----
    // Edições com dia marcado mas sem bloco (kind=edit_event) — ex.: dias
    // marcados antes de o bloco existir. Cria o que falta (idempotente).
    const { data: comBloco } = await sb
      .from("google_sync")
      .select("content_id")
      .eq("user_id", userId)
      .eq("kind", "edit_event");
    const jaTemBloco = new Set((comBloco ?? []).map((r) => r.content_id));

    const { data: paraAgendar } = await sb
      .from("contents")
      .select("id")
      .not("editing_date", "is", null)
      .in("status", STATUS_EDICAO);

    for (const c of paraAgendar ?? []) {
      if (!jaTemBloco.has(c.id)) await sincronizarSessaoEdicao(c.id);
    }
  } catch (e) {
    console.error("reconciliarTarefasGoogle:", e);
  }
}
