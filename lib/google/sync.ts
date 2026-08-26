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

const TZ = "America/Boa_Vista";
const STATUS_EDICAO: ContentStatus[] = [
  "Fila de edição",
  "Em edição",
  "Ajustes",
];

/**
 * Etapas em que a edição FOI CONCLUÍDA (avançou pra revisão em diante). Ao
 * chegar aqui, a tarefa de edição vira "concluída" no Google (fica de
 * registro do dia em que editou) em vez de sumir.
 */
const STATUS_EDICAO_CONCLUIDA: ContentStatus[] = [
  "Revisão interna",
  "Aprovação do cliente",
  "Aprovado",
  "Agendado",
  "Publicado",
];

type SB = ReturnType<typeof createClient>;
/**
 * Tipo de item sincronizado: evento de gravação (event), tarefa de edição
 * (task), evento de postagem (post) ou bloco da sessão de edição na agenda
 * (edit_event — quando a Fran agenda quando vai editar).
 */
type SyncKind = "event" | "task" | "post" | "edit_event";

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
// Helpers de data/hora (servidor roda em America/Boa_Vista)
// -------------------------------------------------------------
function diaSeguinte(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/**
 * Offset fixo de Boa Vista / Roraima (UTC-4, sem horário de verão). Usamos o
 * offset explícito no dateTime para o instante ficar inequívoco (evita o
 * horário "escorregar" dependendo de como o Google resolve o nome do fuso).
 */
const OFFSET_LOCAL = "-04:00";

/** Soma `minutos` a date+hhmm, rolando de dia se passar de 23:59. */
function somarMinutos(
  date: string,
  hhmm: string,
  minutos: number,
): { date: string; time: string } {
  const [h, m] = hhmm.split(":").map(Number);
  let total = (h ?? 0) * 60 + (m ?? 0) + minutos;
  let dia = date;
  while (total >= 24 * 60) {
    total -= 24 * 60;
    dia = diaSeguinte(dia);
  }
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return {
    date: dia,
    time: `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`,
  };
}

/** Fim do evento = início + 1h (rola de dia se passar de 23:59). */
function fimEvento(date: string, hhmm: string): { date: string; time: string } {
  return somarMinutos(date, hhmm, 60);
}

/** Quantos conteúdos apontam para o MESMO evento (evento de lote é compartilhado). */
async function contarEventosSync(
  sb: SB,
  userId: string,
  externalId: string,
): Promise<number> {
  const { count } = await sb
    .from("google_sync")
    .select("content_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", "event")
    .eq("external_id", externalId);
  return count ?? 0;
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
        "title, format, recording_date, recording_time, recording_location, participants, client_id, cover_source_id",
      )
      .eq("id", contentId)
      .maybeSingle();
    if (!c) return;

    // Capa (arte vinculada a um vídeo) NUNCA vira evento — capa é sempre TAREFA.
    // Se havia um evento antigo de capa, remove-o.
    if (c.cover_source_id) {
      const antigo = await idSync(sb, contentId, userId, "event");
      if (antigo) {
        const calCapa = encodeURIComponent(
          await calendarioId(sb, userId, token, "producao"),
        );
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calCapa}/events/${antigo}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
        );
        await apagarSync(sb, contentId, userId, "event");
      }
      return;
    }

    const existente = await idSync(sb, contentId, userId, "event");
    // Nome do cliente (para aparecer no evento: com quem vai gravar).
    const { data: cli } = await sb
      .from("clients")
      .select("name")
      .eq("id", c.client_id)
      .maybeSingle();
    const nomeCliente = cli?.name ?? null;
    // Gravações e fotos vão para o calendário "Imagine Produção".
    const calId = encodeURIComponent(
      await calendarioId(sb, userId, token, "producao"),
    );

    // Evento de LOTE (compartilhado por vários conteúdos): mudanças individuais
    // não devem mexer no evento único — só desvinculam este conteúdo.
    const compartilhado = existente
      ? (await contarEventosSync(sb, userId, existente)) > 1
      : false;

    // Sem data de gravação => remove o evento, se houver.
    if (!c.recording_date) {
      if (existente) {
        if (compartilhado) {
          // Evento de lote: só tira este conteúdo, mantém o evento dos outros.
          await apagarSync(sb, contentId, userId, "event");
        } else {
          await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${existente}`,
            { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
          );
          await apagarSync(sb, contentId, userId, "event");
        }
      }
      return;
    }

    // Evento de lote existente: não relabela com um vídeo só. Deixa como está.
    if (compartilhado) return;

    const participantes = (c.participants ?? []).join(", ");
    // Gravação/produção (e produção de fotos das artes) é da Fran (producer).
    const resp1 = await rotuloResponsavel(sb, "producer");
    const emailResp = await emailPorPapel(sb, "producer");
    const verboProd = ehArte(c.format) ? "Fotos" : "Gravação";
    // Cliente no título (com quem vai gravar) + na descrição.
    const cliRotulo = nomeCliente ? ` · ${nomeCliente}` : "";
    const descLinhas = [
      nomeCliente ? `Cliente: ${nomeCliente}` : null,
      participantes ? `Participantes: ${participantes}` : null,
    ].filter(Boolean);
    // null (não undefined) para LIMPAR campos antigos no PATCH.
    const corpo: Record<string, unknown> = {
      summary: `${verboProd}${resp1}${cliRotulo}: ${c.title}`,
      description: descLinhas.length ? descLinhas.join("\n") : null,
      location: c.recording_location ?? null,
      // Responsável entra como participante do evento (agenda única).
      attendees: emailResp ? [{ email: emailResp }] : [],
    };
    if (c.recording_time) {
      const fim = fimEvento(c.recording_date, c.recording_time);
      corpo.start = {
        dateTime: `${c.recording_date}T${c.recording_time}:00${OFFSET_LOCAL}`,
        timeZone: TZ,
      };
      corpo.end = {
        dateTime: `${fim.date}T${fim.time}:00${OFFSET_LOCAL}`,
        timeZone: TZ,
      };
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
// EVENTO (gravação em LOTE) — um evento só para vários vídeos
// -------------------------------------------------------------
/**
 * Cria UM evento para vários vídeos do mesmo cliente (gravados juntos).
 * Duração = 1h por vídeo. O mesmo evento é vinculado a todos os conteúdos.
 */
export async function sincronizarGravacaoEmLote(
  contentIds: string[],
): Promise<void> {
  try {
    if (contentIds.length === 0) return;
    const userId = await usuarioAtualId();
    if (!userId) return;
    const sb = createClient();
    const token = await tokenDoUsuario(sb, userId);
    if (!token) return;

    const { data: cs } = await sb
      .from("contents")
      .select("id, title, recording_date, recording_time, recording_location, client_id")
      .in("id", contentIds);
    if (!cs || cs.length === 0) return;

    const base0 = cs[0];
    const data = base0.recording_date;
    if (!data) return;
    const hora = base0.recording_time;

    const { data: cli } = await sb
      .from("clients")
      .select("name")
      .eq("id", base0.client_id)
      .maybeSingle();
    const nomeCli = cli?.name ?? null;
    const resp1 = await rotuloResponsavel(sb, "producer");
    const emailResp = await emailPorPapel(sb, "producer");

    const lista = cs.map((c, i) => `${i + 1}. ${c.title}`).join("\n");
    const descLinhas = [
      nomeCli ? `Cliente: ${nomeCli}` : null,
      `Vídeos (${cs.length}):`,
      lista,
    ].filter(Boolean);

    const corpo: Record<string, unknown> = {
      summary: `Gravação${resp1}${nomeCli ? ` · ${nomeCli}` : ""}: ${cs.length} vídeo${cs.length > 1 ? "s" : ""}`,
      description: descLinhas.join("\n"),
      location: base0.recording_location ?? null,
      attendees: emailResp ? [{ email: emailResp }] : [],
    };
    if (hora) {
      const fim = somarMinutos(data, hora, cs.length * 60); // 1h por vídeo
      corpo.start = {
        dateTime: `${data}T${hora}:00${OFFSET_LOCAL}`,
        timeZone: TZ,
      };
      corpo.end = {
        dateTime: `${fim.date}T${fim.time}:00${OFFSET_LOCAL}`,
        timeZone: TZ,
      };
    } else {
      corpo.start = { date: data };
      corpo.end = { date: diaSeguinte(data) };
    }

    const calId = encodeURIComponent(
      await calendarioId(sb, userId, token, "producao"),
    );
    const base = `https://www.googleapis.com/calendar/v3/calendars/${calId}/events`;
    const q = "?sendUpdates=none";

    // Reaproveita o evento já vinculado ao primeiro conteúdo (reagendamento).
    const existente = await idSync(sb, base0.id, userId, "event");
    const resp = await fetch(existente ? `${base}/${existente}${q}` : `${base}${q}`, {
      method: existente ? "PATCH" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(corpo),
    });

    let eventId: string | null = existente;
    if (resp.ok && !existente) {
      const j = (await resp.json()) as { id?: string };
      eventId = j.id ?? null;
    } else if (!resp.ok) {
      // Evento sumiu do Google: recria.
      const novo = await fetch(`${base}${q}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(corpo),
      });
      if (novo.ok) {
        const j = (await novo.json()) as { id?: string };
        eventId = j.id ?? null;
      }
    }

    // Vincula o MESMO evento a todos os conteúdos do lote.
    if (eventId) {
      for (const c of cs) await salvarSync(sb, c.id, userId, "event", eventId);
    }
  } catch (e) {
    console.error("sincronizarGravacaoEmLote:", e);
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

    const { data: c } = await sb
      .from("contents")
      .select(
        "title, format, editing_deadline, editing_date, planned_date, recording_date",
      )
      .eq("id", contentId)
      .maybeSingle();

    // Tem tarefa de edição quando está em edição (Fila/Em edição/Ajustes) OU
    // quando já foi gravado E a Fran escolheu o dia de editar (editing_date).
    const emEdicao =
      STATUS_EDICAO.includes(novoStatus) ||
      (novoStatus === "Gravado" && !!c?.editing_date);

    // Saiu da edição. Se AVANÇOU (revisão em diante), marca a tarefa como
    // CONCLUÍDA no Google — fica de registro de que editou naquele dia. Se foi
    // cancelado/pausado/voltou pra trás, aí sim remove a tarefa.
    if (!emEdicao || !c) {
      if (existente) {
        const concluiu = !!c && STATUS_EDICAO_CONCLUIDA.includes(novoStatus);
        const url = `https://www.googleapis.com/tasks/v1/lists/@default/tasks/${existente}`;
        if (concluiu) {
          await fetch(url, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: "completed" }),
          });
        } else {
          await fetch(url, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
        }
        // Solta o vínculo: a tarefa concluída fica parada no Google como
        // histórico; se a edição recomeçar (Ajustes), cria uma nova.
        await apagarSync(sb, contentId, userId, "task");
      }
      return;
    }

    // Arte/design (Carrossel, Post estático) => Vitória (planner).
    // Edição de vídeo (demais formatos) => Fran (producer).
    const arte = ehArte(c.format);
    const resp2 = await rotuloResponsavel(sb, arte ? "planner" : "producer");
    const verbo = arte ? "Arte" : "Editar";

    // Dia da tarefa: se a Fran escolheu QUANDO vai editar (editing_date), a
    // tarefa cai nesse dia no Google (ela ajusta a hora lá). Senão, cai no
    // prazo de entrega (48h antes / ajuste manual).
    const due =
      c.editing_date ??
      prazoEntregaEfetivo(c) ??
      c.planned_date ??
      c.recording_date;
    const corpo: Record<string, unknown> = {
      title: `${verbo}${resp2}: ${c.title}`,
    };
    if (due) corpo.due = `${due}T00:00:00.000Z`;

    const base = "https://www.googleapis.com/tasks/v1/lists/@default/tasks";
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
      // Tarefa apagada à mão no Google: limpa o mapeamento e recria agora.
      if (existente && resp.status === 404) {
        await apagarSync(sb, contentId, userId, "task");
        const novo = await fetch(base, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(corpo),
        });
        if (novo.ok) {
          const j = (await novo.json()) as { id?: string };
          if (j.id) await salvarSync(sb, contentId, userId, "task", j.id);
        }
        return;
      }
      console.error("Google Tarefas falhou:", resp.status);
      return;
    }
    if (!existente) {
      const json = (await resp.json()) as { id?: string };
      if (json.id) await salvarSync(sb, contentId, userId, "task", json.id);
    }
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
      .select("title, planned_date, status, client_id")
      .eq("id", contentId)
      .maybeSingle();
    if (!c) return;

    const { data: cliPost } = await sb
      .from("clients")
      .select("name")
      .eq("id", c.client_id)
      .maybeSingle();
    const nomeCli = cliPost?.name ?? null;

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
      summary: `Postar${nomeCli ? ` · ${nomeCli}` : ""}: ${c.title}`,
      description: nomeCli ? `Cliente: ${nomeCli}` : null,
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
// EVENTO (sessão de edição) — bloco na agenda "Imagine Produção"
// Quando a Fran agenda QUANDO vai editar um vídeo, vira um bloco na agenda.
// -------------------------------------------------------------
export async function sincronizarSessaoEdicao(contentId: string): Promise<void> {
  try {
    const userId = await usuarioAtualId();
    if (!userId) return;
    const sb = createClient();
    const token = await tokenDoUsuario(sb, userId);
    if (!token) return;

    const { data: c } = await sb
      .from("contents")
      .select("title, editing_date, editing_time, client_id")
      .eq("id", contentId)
      .maybeSingle();
    if (!c) return;

    const existente = await idSync(sb, contentId, userId, "edit_event");
    const calId = encodeURIComponent(
      await calendarioId(sb, userId, token, "producao"),
    );

    // Sem dia de edição => remove o bloco, se houver.
    if (!c.editing_date) {
      if (existente) {
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${existente}?sendUpdates=none`,
          { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
        );
        await apagarSync(sb, contentId, userId, "edit_event");
      }
      return;
    }

    const { data: cli } = await sb
      .from("clients")
      .select("name")
      .eq("id", c.client_id)
      .maybeSingle();
    const nomeCli = cli?.name ?? null;
    const resp1 = await rotuloResponsavel(sb, "producer");
    const emailResp = await emailPorPapel(sb, "producer");

    const corpo: Record<string, unknown> = {
      summary: `Editar${resp1}${nomeCli ? ` · ${nomeCli}` : ""}: ${c.title}`,
      description: nomeCli ? `Cliente: ${nomeCli}` : null,
      attendees: emailResp ? [{ email: emailResp }] : [],
    };
    if (c.editing_time) {
      const fim = somarMinutos(c.editing_date, c.editing_time, 120); // 2h padrão
      corpo.start = {
        dateTime: `${c.editing_date}T${c.editing_time}:00${OFFSET_LOCAL}`,
        timeZone: TZ,
      };
      corpo.end = {
        dateTime: `${fim.date}T${fim.time}:00${OFFSET_LOCAL}`,
        timeZone: TZ,
      };
    } else {
      corpo.start = { date: c.editing_date };
      corpo.end = { date: diaSeguinte(c.editing_date) };
    }

    const base = `https://www.googleapis.com/calendar/v3/calendars/${calId}/events`;
    const q = "?sendUpdates=none";
    const resp = await fetch(existente ? `${base}/${existente}${q}` : `${base}${q}`, {
      method: existente ? "PATCH" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(corpo),
    });
    if (!resp.ok) {
      if (existente && resp.status === 404) {
        await apagarSync(sb, contentId, userId, "edit_event");
        const novo = await fetch(`${base}${q}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(corpo),
        });
        if (novo.ok) {
          const j = (await novo.json()) as { id?: string };
          if (j.id) await salvarSync(sb, contentId, userId, "edit_event", j.id);
        }
        return;
      }
      console.error("Google Agenda (sessão de edição) falhou:", resp.status);
      return;
    }
    if (!existente) {
      const json = (await resp.json()) as { id?: string };
      if (json.id) await salvarSync(sb, contentId, userId, "edit_event", json.id);
    }
  } catch (e) {
    console.error("sincronizarSessaoEdicao:", e);
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
    const blocoEdicao = await idSync(sb, contentId, userId, "edit_event");
    if (blocoEdicao) {
      const calProd = encodeURIComponent(
        await calendarioId(sb, userId, token, "producao"),
      );
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calProd}/events/${blocoEdicao}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      );
    }
    // google_sync some por cascade quando o conteúdo é apagado.
  } catch (e) {
    console.error("removerGoogleDoConteudo:", e);
  }
}
