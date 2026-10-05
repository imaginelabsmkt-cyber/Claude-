import "server-only";
import { createClient } from "@/lib/supabase/server";
import { usuarioAtualId } from "@/lib/auth";
import { tokenDoUsuario } from "@/lib/google/sync";
import { prazoEntregaEfetivo } from "@/lib/rules/contents";

/** Marcador que o sistema grava nas notas da tarefa: [favie:<content_id>]. */
const RE_MARCADOR = /\[favie:([0-9a-fA-F-]{10,})\]/;

/**
 * SINCRONIZAÇÃO INVERSA (Google -> sistema) do DIA DE EDIÇÃO.
 *
 * A edição vira uma TAREFA no Google, com o dia no campo "due". Quando a Fran
 * marca/ajusta o dia de editar direto no Google (inclusive dos que ainda vai
 * editar), aqui a gente traz esse dia de volta pro campo "Editar em" do sistema.
 *
 * Só preenche quando o dia no Google é DIFERENTE do prazo automático — ou seja,
 * quando foi uma escolha dela — pra não encher tudo com o prazo de entrega.
 *
 * Best-effort: nunca quebra a página; tem timeout curto pro Google não travar.
 */
export async function puxarEdicoesDoGoogle(): Promise<number> {
  try {
    const userId = await usuarioAtualId();
    if (!userId) return 0;
    const sb = createClient();
    const token = await tokenDoUsuario(sb, userId);
    if (!token) return 0;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    let resp: Response;
    try {
      resp = await fetch(
        "https://www.googleapis.com/tasks/v1/lists/@default/tasks?showHidden=true&maxResults=100",
        { headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal },
      );
    } finally {
      clearTimeout(timer);
    }
    if (!resp.ok) return 0;

    const j = (await resp.json()) as {
      items?: { id: string; notes?: string; due?: string; status?: string }[];
    };

    // content_id -> dia (YYYY-MM-DD) que está marcado no Google.
    const porConteudo = new Map<string, string>();
    for (const t of j.items ?? []) {
      const m = (t.notes ?? "").match(RE_MARCADOR);
      if (!m || !t.due) continue;
      const dia = t.due.slice(0, 10); // Google Tasks guarda só a data
      if (/^\d{4}-\d{2}-\d{2}$/.test(dia)) porConteudo.set(m[1], dia);
    }
    if (porConteudo.size === 0) return 0;

    const ids = [...porConteudo.keys()];
    const { data: conts } = await sb
      .from("contents")
      .select("id, editing_date, planned_date, editing_deadline, recording_date")
      .in("id", ids);

    let mudou = 0;
    for (const c of conts ?? []) {
      const diaGoogle = porConteudo.get(c.id);
      if (!diaGoogle || diaGoogle === c.editing_date) continue;
      // Prazo automático que o sistema usaria se ela NÃO tivesse escolhido o dia.
      const auto =
        prazoEntregaEfetivo(c) ?? c.planned_date ?? c.recording_date ?? null;
      if (diaGoogle === auto) continue; // é o automático, não uma escolha dela
      const { error } = await sb
        .from("contents")
        .update({ editing_date: diaGoogle })
        .eq("id", c.id);
      if (!error) mudou += 1;
    }
    return mudou;
  } catch {
    return 0;
  }
}
