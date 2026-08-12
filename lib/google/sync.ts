/**
 * Sincronização com o Google (mão única: sistema -> Google).
 * - Gravação (tem data/hora, envolve cliente) => EVENTO na Agenda.
 * - Edição (trabalho interno) => TAREFA (com o quadradinho de concluir).
 *
 * Tudo é "melhor esforço": se o Google falhar, a ação principal do sistema
 * NÃO quebra — apenas não sincroniza (e loga no servidor).
 * Empurra para a conta do usuário que está fazendo a ação (se conectado).
 */
import { createClient } from "@/lib/supabase/server";
import { usuarioAtualId } from "@/lib/auth";
import { renovarAccessToken, GoogleRevogadoError } from "@/lib/google/oauth";
import { rotuloResponsavel, emailPorPapel, ehArte } from "@/lib/google/responsavel";
import { calendarioId } from "@/lib/google/calendars";
import { prazoEntregaEfetivo } from "@/lib/rules/contents";
import type { ContentStatus } from "@/types";

const TZ = "America/Sao_Paulo";
const STATUS_EDICAO: ContentStatus[] = [
  "Fila de edição",
  "Em edição",
  "Ajustes",
];

type SB = ReturnType<typeof createClient>;
/** Tipo de item sincronizado: evento de gravação, tarefa de edição ou evento de postagem. */
type SyncKind = "event" | "task" | "post";

/** Access token do usuário (a partir do refresh token guardado). Null se não conectado. */
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
    // Token revogado/expirado: remove a conexão para forçar reconectar.
    if (e instanceof GoogleRevogadoError) {
      await sb.from("google_accounts").delete().eq("user_id", userId);
    }
    return null;
  }
}

async function idSync(
  sb: SB,
  contentId: string,
  userId: string,
  kind: SyncKind,
): Promise<string | null> {
  const { data } = await sb
    .from("google_sync")
    .select("external_id")
    .eq("content_id", contentId)
    .eq("user_id", userId)
    .eq("kind", kind)
    .maybeSingle();
  return data?.external_id ?? null;
}

async function salvarSync(
  sb: SB,
  contentId: string,
  userId: string,
  kind: SyncKind,
  externalId: string,
) {
  await sb.from("google_sync").upsert(
    {
      content_id: contentId,
      user_id: userId,
      kind,
      external_id: externalId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "content_id,user_id,kind" },
  );
}

async function apagarSync(
  sb: SB,
  contentId: string,
  userId: string,
  kind: SyncKind,
) {
  await sb
    .from("google_sync")
    .delete()
    .eq("content_id", contentId)
    .eq("user_id", userId)
    .eq("kind", kind);
}

// -------------------------------------------------------------
// Helpers de data/hora (servidor roda em America/Sao_Paulo)
// -------------------------------------------------------------
function diaSeguinte(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/** Fim do evento = início + 1h, rolando para o dia seguinte se passar de 23:59. */
function fimEvento(
  date: string,
  hhmm: string,
): { date: string; time: string } {
  const [h, m] = hhmm.split(":").map(Number);
  const total = (h ?? 0) * 60 + (m ?? 0) + 60;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  const rolou = total >= 24 * 60;
  return {
    date: rolou ? diaSeguinte(date) : date,
    time: `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`,
  };
}

// -------------------------------------------------------------
// EVENTO (gravação)
// -------------------------------------------------------------
export async function sincronizarGravacao(contentId: string): Promise<void> {
  try {
    const userId = await usuarioAtualId();
    if (!userId) return;
    const sb = createClient();
    const token = await tokenDoUsuario(sb, userId);
    if (!token) return; // usuário não conectou o Google

    const { data: c } = await sb
      .from("contents")
      .select(
        "title, format, recording_date, recording_time, recording_location, participants, client_id",
      )
      .eq("id", contentId)
      .maybeSingle();
    if (!c) return;

    const existente = await idSync(sb, contentId, userId, "event");
    // Gravações e fotos vão para o calendário "Imagine Produção".
    const calId = encodeURIComponent(
      await calendarioId(sb, userId, token, "producao"),
    );

    // Sem data de gravação => remove o evento, se houver.
    if (!c.recording_date) {
      if (existente) {
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${existente}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
        );
        await apagarSync(sb, contentId, userId, "event");
      }
      return;
    }

    const participantes = (c.participants ?? []).join(", ");
    // Gravação/produção (e produção de fotos das artes) é da Fran (producer).
    const resp1 = await rotuloResponsavel(sb, "producer");
    const emailResp = await emailPorPapel(sb, "producer");
    const verboProd = ehArte(c.format) ? "Fotos" : "Gravação";
    // null (não undefined) para LIMPAR campos antigos no PATCH.
    const corpo: Record<string, unknown> = {
      summary: `${verboProd}${resp1}: ${c.title}`,
      description: participantes ? `Participantes: ${participantes}` : null,
      location: c.recording_location ?? null,
      // Responsável entra como participante do evento (agenda única).
      attendees: emailResp ? [{ email: emailResp }] : [],
    };
    if (c.recording_time) {
      const fim = fimEvento(c.recording_date, c.recording_time);
      corpo.start = {
        dateTime: `${c.recording_date}T${c.recording_time}:00`,
        timeZone: TZ,
      };
      corpo.end = { dateTime: `${fim.date}T${fim.time}:00`, timeZone: TZ };
    } else {
      corpo.start = { date: c.recording_date };
      corpo.end = { date: diaSeguinte(c.recording_date) };
    }

    const base = `https://www.googleapis.com/calendar/v3/calendars/${calId}/events`;
    const q = "?sendUpdates=none"; // não dispara convite por e-mail
    const url = existente ? `${base}/${existente}${q}` : `${base}${q}`;
    const resp = await fetch(url, {
      method: existente ? "PATCH" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(corpo),
    });
    if (!resp.ok) {
      // Evento apagado à mão no Google: limpa o mapeamento e recria agora.
      if (existente && resp.status === 404) {
        await apagarSync(sb, contentId, userId, "event");
        const novo = await fetch(`${base}${q}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(corpo),
        });
        if (novo.ok) {
          const json = (await novo.json()) as { id?: string };
          if (json.id) await salvarSync(sb, contentId, userId, "event", json.id);
        }
        return;
      }
      console.error("Google Agenda (evento) falhou:", resp.status);
      return;
    }
    if (!existente) {
      const json = (await resp.json()) as { id?: string };
      if (json.id) await salvarSync(sb, contentId, userId, "event", json.id);
    }
  } catch (e) {
    console.error("sincronizarGravacao:", e);
  }
}

// -------------------------------------------------------------
// TAREFA (edição)
// -------------------------------------------------------------
export async function sincronizarEdicao(
  contentId: string,
  novoStatus: ContentStatus,
): Promise<void> {
  try {
    const userId = await usuarioAtualId();
    if (!userId) return;
    const sb = createClient();
    const token = await tokenDoUsuario(sb, userId);
    if (!token) return;

    const existente = await idSync(sb, contentId, userId, "task");
    const emEdicao = STATUS_EDICAO.includes(novoStatus);

    // Saiu da edição => remove a tarefa (mantém o Google limpo).
    if (!emEdicao) {
      if (existente) {
        await fetch(
          `https://www.googleapis.com/tasks/v1/lists/@default/tasks/${existente}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
        );
        await apagarSync(sb, contentId, userId, "task");
      }
      return;
    }

    // Está em edição e já tem tarefa => nada a fazer.
    if (existente) return;

    const { data: c } = await sb
      .from("contents")
      .select("title, format, editing_deadline, planned_date, recording_date")
      .eq("id", contentId)
      .maybeSingle();
    if (!c) return;

    // Arte/design (Carrossel, Post estático) => Vitória (planner).
    // Edição de vídeo (demais formatos) => Fran (producer).
    const arte = ehArte(c.format);
    const resp2 = await rotuloResponsavel(sb, arte ? "planner" : "producer");
    const verbo = arte ? "Arte" : "Editar";

    // Entrega: 48h antes da postagem (automático) ou o ajuste manual.
    const due = prazoEntregaEfetivo(c) ?? c.planned_date ?? c.recording_date;
    const corpo: Record<string, unknown> = {
      title: `${verbo}${resp2}: ${c.title}`,
    };
    if (due) corpo.due = `${due}T00:00:00.000Z`;

    const resp = await fetch(
      "https://www.googleapis.com/tasks/v1/lists/@default/tasks",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(corpo),
      },
    );
    if (!resp.ok) {
      console.error("Google Tarefas falhou:", resp.status);
      return;
    }
    const json = (await resp.json()) as { id?: string };
    if (json.id) await salvarSync(sb, contentId, userId, "task", json.id);
  } catch (e) {
    console.error("sincronizarEdicao:", e);
  }
}

// -------------------------------------------------------------
// EVENTO (postagem) — calendário "Imagine Postagens"
// -------------------------------------------------------------
export async function sincronizarPostagem(contentId: string): Promise<void> {
  try {
    const userId = await usuarioAtualId();
    if (!userId) return;
    const sb = createClient();
    const token = await tokenDoUsuario(sb, userId);
    if (!token) return;

    const { data: c } = await sb
      .from("contents")
      .select("title, planned_date, status")
      .eq("id", contentId)
      .maybeSingle();
    if (!c) return;

    const existente = await idSync(sb, contentId, userId, "post");
    const calId = encodeURIComponent(
      await calendarioId(sb, userId, token, "postagens"),
    );

    // Sem data prevista ou cancelado => remove o evento de postagem.
    if (!c.planned_date || c.status === "Cancelado") {
      if (existente) {
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${existente}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
        );
        await apagarSync(sb, contentId, userId, "post");
      }
      return;
    }

    const corpo: Record<string, unknown> = {
      summary: `Postar: ${c.title}`,
      start: { date: c.planned_date },
      end: { date: diaSeguinte(c.planned_date) },
    };
    const base = `https://www.googleapis.com/calendar/v3/calendars/${calId}/events`;
    const url = existente ? `${base}/${existente}` : base;
    const resp = await fetch(url, {
      method: existente ? "PATCH" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(corpo),
    });
    if (!resp.ok) {
      if (existente && resp.status === 404) {
        await apagarSync(sb, contentId, userId, "post");
        const novo = await fetch(base, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(corpo),
        });
        if (novo.ok) {
          const json = (await novo.json()) as { id?: string };
          if (json.id) await salvarSync(sb, contentId, userId, "post", json.id);
        }
        return;
      }
      console.error("Google Agenda (postagem) falhou:", resp.status);
      return;
    }
    if (!existente) {
      const json = (await resp.json()) as { id?: string };
      if (json.id) await salvarSync(sb, contentId, userId, "post", json.id);
    }
  } catch (e) {
    console.error("sincronizarPostagem:", e);
  }
}

// -------------------------------------------------------------
// Remoção (ao excluir o conteúdo)
// -------------------------------------------------------------
export async function removerGoogleDoConteudo(contentId: string): Promise<void> {
  try {
    const userId = await usuarioAtualId();
    if (!userId) return;
    const sb = createClient();
    const token = await tokenDoUsuario(sb, userId);
    if (!token) return;

    const evento = await idSync(sb, contentId, userId, "event");
    if (evento) {
      const calProd = encodeURIComponent(
        await calendarioId(sb, userId, token, "producao"),
      );
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calProd}/events/${evento}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      );
    }
    const postagem = await idSync(sb, contentId, userId, "post");
    if (postagem) {
      const calPost = encodeURIComponent(
        await calendarioId(sb, userId, token, "postagens"),
      );
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calPost}/events/${postagem}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      );
    }
    const tarefa = await idSync(sb, contentId, userId, "task");
    if (tarefa) {
      await fetch(
        `https://www.googleapis.com/tasks/v1/lists/@default/tasks/${tarefa}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      );
    }
    // google_sync some por cascade quando o conteúdo é apagado.
  } catch (e) {
    console.error("removerGoogleDoConteudo:", e);
  }
}
