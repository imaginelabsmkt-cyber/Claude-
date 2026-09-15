/**
 * Sincronização das DEMANDAS gerais com o Google Tarefas (mão única).
 * Cada demanda ativa vira uma tarefa (com quadradinho) na conta conectada.
 * - Feita  => marca a tarefa como concluída.
 * - Sem due/normal => cria/atualiza a tarefa.
 * Idempotente: guarda o id da tarefa em demands.google_task_id e usa um "RG"
 * nas notas, então nunca duplica.
 * Melhor esforço: falha no Google não quebra o salvamento da demanda.
 */
import { createClient } from "@/lib/supabase/server";
import { usuarioAtualId } from "@/lib/auth";
import { renovarAccessToken, GoogleRevogadoError } from "@/lib/google/oauth";
import { marcadorTarefa, acharTarefaPorMarcador } from "@/lib/google/sync";

const BASE = "https://www.googleapis.com/tasks/v1/lists/@default/tasks";

async function tokenAtual(
  sb: ReturnType<typeof createClient>,
  userId: string,
): Promise<string | null> {
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

/** Cria/atualiza/conclui a tarefa do Google para uma demanda. */
export async function sincronizarDemanda(demandId: string): Promise<void> {
  try {
    const userId = await usuarioAtualId();
    if (!userId) return;
    const sb = createClient();
    const token = await tokenAtual(sb, userId);
    if (!token) return;

    const { data: d } = await sb
      .from("demands")
      .select(
        "title, category, status, due_date, google_task_id, client_id, assignee_ids",
      )
      .eq("id", demandId)
      .maybeSingle();
    if (!d) return;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    let taskId = d.google_task_id as string | null;

    // Concluída => marca a tarefa como completa (fica de registro) e solta o id.
    if (d.status === "Feita") {
      if (taskId) {
        await fetch(`${BASE}/${taskId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ status: "completed" }),
        });
        await sb
          .from("demands")
          .update({ google_task_id: null })
          .eq("id", demandId);
      }
      return;
    }

    // Sem id local? Procura pelo RG a tarefa que já existe (evita duplicar).
    if (!taskId) taskId = await acharTarefaPorMarcador(token, demandId);

    // Nomes (cliente + responsáveis) para o título/notas.
    const nomeCli = d.client_id
      ? (
          await sb
            .from("clients")
            .select("name")
            .eq("id", d.client_id)
            .maybeSingle()
        ).data?.name ?? null
      : null;
    const ids = (d.assignee_ids as string[] | null) ?? [];
    let resps = "";
    if (ids.length > 0) {
      const { data: ps } = await sb
        .from("profiles")
        .select("name")
        .in("id", ids);
      resps = (ps ?? []).map((p) => p.name).join(", ");
    }

    const titulo = `${d.category ? `${d.category}: ` : ""}${d.title}${nomeCli ? ` · ${nomeCli}` : ""}`;
    const notas = [resps ? `Resp.: ${resps}` : null, marcadorTarefa(demandId)]
      .filter(Boolean)
      .join("\n");
    const corpo: Record<string, unknown> = { title: titulo, notes: notas };
    if (d.due_date) corpo.due = `${d.due_date}T00:00:00.000Z`;

    const resp = await fetch(taskId ? `${BASE}/${taskId}` : BASE, {
      method: taskId ? "PATCH" : "POST",
      headers,
      body: JSON.stringify(corpo),
    });
    if (resp.ok) {
      if (!d.google_task_id) {
        const j = (await resp.json()) as { id?: string };
        if (j.id)
          await sb
            .from("demands")
            .update({ google_task_id: j.id })
            .eq("id", demandId);
      }
    } else if (resp.status === 404 && taskId) {
      // Tarefa sumiu no Google: recria.
      const novo = await fetch(BASE, {
        method: "POST",
        headers,
        body: JSON.stringify(corpo),
      });
      if (novo.ok) {
        const j = (await novo.json()) as { id?: string };
        if (j.id)
          await sb
            .from("demands")
            .update({ google_task_id: j.id })
            .eq("id", demandId);
      }
    }
  } catch (e) {
    console.error("sincronizarDemanda:", e);
  }
}

/** Apaga a tarefa do Google de uma demanda que foi excluída. */
export async function removerTarefaDemanda(taskId: string | null): Promise<void> {
  try {
    if (!taskId) return;
    const userId = await usuarioAtualId();
    if (!userId) return;
    const sb = createClient();
    const token = await tokenAtual(sb, userId);
    if (!token) return;
    await fetch(`${BASE}/${taskId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (e) {
    console.error("removerTarefaDemanda:", e);
  }
}
