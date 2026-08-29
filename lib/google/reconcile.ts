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
import { criarCapaDoVideo } from "@/lib/content/covers";
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

    // O app é a FONTE DA VERDADE das datas: não puxamos mais a data do evento
    // do Google de volta pro sistema (isso revertia a data que a pessoa marcava
    // no app quando o Google estava desatualizado). A sincronização de datas é
    // só de mão única: app -> Google.
  } catch (e) {
    console.error("reconciliarTarefasGoogle:", e);
  }
}
