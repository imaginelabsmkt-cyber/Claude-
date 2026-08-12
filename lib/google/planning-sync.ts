/**
 * Sincronização do PLANEJAMENTO com o Google (mão única).
 * - Reunião (meeting_date) => EVENTO na Agenda.
 * - Prazo de entrega (delivery_deadline) => TAREFA (com quadradinho).
 * Melhor esforço: falha no Google não quebra o salvamento do planejamento.
 */
import { createClient } from "@/lib/supabase/server";
import { usuarioAtualId } from "@/lib/auth";
import { renovarAccessToken, GoogleRevogadoError } from "@/lib/google/oauth";

const TZ = "America/Sao_Paulo";
type SB = ReturnType<typeof createClient>;

async function tokenDoUsuario(sb: SB, userId: string): Promise<string | null> {
  const { data } = await sb
    .from("google_accounts")
    .select("refresh_token")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data?.refresh_token) return null;
  try {
    return await renovarAccessToken(data.refresh_token);
  } catch (e) {
    if (e instanceof GoogleRevogadoError) {
      await sb.from("google_accounts").delete().eq("user_id", userId);
    }
    return null;
  }
}

function diaSeguinte(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function fimEvento(date: string, hhmm: string): { date: string; time: string } {
  const [h, m] = hhmm.split(":").map(Number);
  const total = (h ?? 0) * 60 + (m ?? 0) + 60;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return {
    date: total >= 1440 ? diaSeguinte(date) : date,
    time: `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`,
  };
}

async function idSync(
  sb: SB,
  planningId: string,
  userId: string,
  kind: "event" | "task",
): Promise<string | null> {
  const { data } = await sb
    .from("planning_google_sync")
    .select("external_id")
    .eq("planning_id", planningId)
    .eq("user_id", userId)
    .eq("kind", kind)
    .maybeSingle();
  return data?.external_id ?? null;
}

async function salvarSync(
  sb: SB,
  planningId: string,
  userId: string,
  kind: "event" | "task",
  externalId: string,
) {
  await sb.from("planning_google_sync").upsert(
    {
      planning_id: planningId,
      user_id: userId,
      kind,
      external_id: externalId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "planning_id,user_id,kind" },
  );
}

async function apagarSync(
  sb: SB,
  planningId: string,
  userId: string,
  kind: "event" | "task",
) {
  await sb
    .from("planning_google_sync")
    .delete()
    .eq("planning_id", planningId)
    .eq("user_id", userId)
    .eq("kind", kind);
}

/** Sincroniza a reunião (evento) e o prazo de entrega (tarefa) do planejamento. */
export async function sincronizarPlanejamentoGoogle(
  planningId: string,
): Promise<void> {
  try {
    const userId = await usuarioAtualId();
    if (!userId) return;
    const sb = createClient();
    const token = await tokenDoUsuario(sb, userId);
    if (!token) return;

    const { data: p } = await sb
      .from("plannings")
      .select("reference_month, meeting_date, meeting_time, delivery_deadline, client_id")
      .eq("id", planningId)
      .maybeSingle();
    if (!p) return;

    const { data: cliente } = await sb
      .from("clients")
      .select("name")
      .eq("id", p.client_id)
      .maybeSingle();
    const nome = cliente?.name ?? "Cliente";
    const rotulo = `${nome} (${p.reference_month})`;

    // ---- Reunião => evento ----
    const evExistente = await idSync(sb, planningId, userId, "event");
    if (!p.meeting_date) {
      if (evExistente) {
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${evExistente}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
        );
        await apagarSync(sb, planningId, userId, "event");
      }
    } else {
      const corpo: Record<string, unknown> = {
        summary: `Reunião de planejamento: ${rotulo}`,
      };
      if (p.meeting_time) {
        const fim = fimEvento(p.meeting_date, p.meeting_time);
        corpo.start = {
          dateTime: `${p.meeting_date}T${p.meeting_time}:00`,
          timeZone: TZ,
        };
        corpo.end = { dateTime: `${fim.date}T${fim.time}:00`, timeZone: TZ };
      } else {
        corpo.start = { date: p.meeting_date };
        corpo.end = { date: diaSeguinte(p.meeting_date) };
      }
      const base =
        "https://www.googleapis.com/calendar/v3/calendars/primary/events";
      const resp = await fetch(evExistente ? `${base}/${evExistente}` : base, {
        method: evExistente ? "PATCH" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(corpo),
      });
      if (resp.ok && !evExistente) {
        const json = (await resp.json()) as { id?: string };
        if (json.id) await salvarSync(sb, planningId, userId, "event", json.id);
      } else if (resp.status === 404 && evExistente) {
        await apagarSync(sb, planningId, userId, "event");
      }
    }

    // ---- Prazo de entrega => tarefa ----
    const tkExistente = await idSync(sb, planningId, userId, "task");
    if (!p.delivery_deadline) {
      if (tkExistente) {
        await fetch(
          `https://www.googleapis.com/tasks/v1/lists/@default/tasks/${tkExistente}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
        );
        await apagarSync(sb, planningId, userId, "task");
      }
    } else {
      const corpo = {
        title: `Entregar planejamento: ${rotulo}`,
        due: `${p.delivery_deadline}T00:00:00.000Z`,
      };
      const base = "https://www.googleapis.com/tasks/v1/lists/@default/tasks";
      const resp = await fetch(tkExistente ? `${base}/${tkExistente}` : base, {
        method: tkExistente ? "PATCH" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(corpo),
      });
      if (resp.ok && !tkExistente) {
        const json = (await resp.json()) as { id?: string };
        if (json.id) await salvarSync(sb, planningId, userId, "task", json.id);
      } else if (resp.status === 404 && tkExistente) {
        await apagarSync(sb, planningId, userId, "task");
      }
    }
  } catch (e) {
    console.error("sincronizarPlanejamentoGoogle:", e);
  }
}
