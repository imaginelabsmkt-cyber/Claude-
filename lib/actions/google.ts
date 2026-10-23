"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { usuarioAtualId } from "@/lib/auth";
import { renovarAccessToken } from "@/lib/google/oauth";
import {
  sincronizarGravacao,
  sincronizarGravacaoEmLote,
  sincronizarPostagem,
  sincronizarEdicao,
} from "@/lib/google/sync";
import { sincronizarPlanejamentoGoogle } from "@/lib/google/planning-sync";
import { sincronizarResultadoSheets } from "@/lib/google/sheets";
import { aposResposta } from "@/lib/after";
import type { ActionResult } from "@/lib/actions/contents";
import type { ContentStatus } from "@/types";

/** Roda as tarefas em lotes de `n` em paralelo (acelera sem estourar a API). */
async function emLotes<T>(
  itens: T[],
  n: number,
  fn: (t: T) => Promise<unknown>,
): Promise<void> {
  for (let i = 0; i < itens.length; i += n) {
    await Promise.all(itens.slice(i, i + n).map((t) => fn(t).catch(() => {})));
  }
}

/** Status em que o vídeo está na fila/edição (viram tarefa + bloco na Agenda). */
const STATUS_EDICAO_REENVIO: ContentStatus[] = [
  "Fila de edição",
  "Em edição",
  "Ajustes",
];

/**
 * Remove a conexão do usuário com o Google.
 * IMPORTANTE: NÃO apaga os vínculos de sincronização (google_sync). Se apagasse,
 * ao reconectar o sistema não reconheceria os eventos já criados e recriaria
 * tudo do zero, gerando DUPLICATAS na agenda. Mantendo os vínculos, o
 * reconectar apenas ATUALIZA os eventos existentes.
 */
export async function desconectarGoogleAction(): Promise<ActionResult> {
  const userId = await usuarioAtualId();
  if (!userId) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const supabase = createClient();
  const { error } = await supabase
    .from("google_accounts")
    .delete()
    .eq("user_id", userId);
  if (error) return { ok: false, error: "Não foi possível desconectar." };

  revalidatePath("/configuracoes");
  return { ok: true };
}

/**
 * Reenvia TUDO ao Google SEM APAGAR nada: só atualiza (ou cria o que está
 * faltando) o que o app controla, usando os vínculos de sincronização, então
 * NUNCA remove eventos criados à mão pela pessoa. Reuniões => Imagine Reuniões,
 * gravações/fotos => Imagine Produção, postagens => Imagine Postagens.
 * Idempotente: pode clicar quantas vezes quiser. Inclui também as gravações que
 * JÁ aconteceram (ficam de registro histórico na agenda).
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
  try {
    await renovarAccessToken(acc.refresh_token);
  } catch {
    return { ok: false, error: "Reconecte o Google e tente de novo." };
  }

  // O reenvio faz muitas chamadas ao Google (uma por item). Rodar isso preso na
  // tela trava a interface. Então valida rápido acima e empurra o trabalho pesado
  // pra segundo plano (waitUntil), em lotes paralelos pra terminar mais rápido.
  // A tela responde na hora e os itens vão aparecendo na agenda em seguida.
  aposResposta(async () => {
    // Não apaga nada: os vínculos de sincronização são mantidos, então cada
    // item é ATUALIZADO no evento que já existe (ou criado se faltar).
    const { data: ps } = await supabase
      .from("plannings")
      .select("id, meeting_date, delivery_deadline");
    const planej = (ps ?? []).filter(
      (p) => p.meeting_date || p.delivery_deadline,
    );
    await emLotes(planej, 4, (p) => sincronizarPlanejamentoGoogle(p.id));

    const { data: cs } = await supabase
      .from("contents")
      .select(
        "id, planned_date, recording_date, recording_time, client_id, status",
      )
      .neq("status", "Cancelado");
    const conts = cs ?? [];

    // Postagens.
    await emLotes(
      conts.filter((c) => c.planned_date),
      4,
      (c) => sincronizarPostagem(c.id),
    );

    // Gravações (agrupadas viram evento único).
    const grupos = new Map<string, string[]>();
    for (const c of conts) {
      if (!c.recording_date) continue;
      const chave = `${c.client_id}|${c.recording_date}|${c.recording_time ?? ""}`;
      grupos.set(chave, [...(grupos.get(chave) ?? []), c.id]);
    }
    await emLotes([...grupos.values()], 4, (ids) =>
      ids.length > 1 ? sincronizarGravacaoEmLote(ids) : sincronizarGravacao(ids[0]),
    );

    // Edições como TAREFA (to-do) no Google.
    await emLotes(
      conts.filter((c) =>
        STATUS_EDICAO_REENVIO.includes(c.status as ContentStatus),
      ),
      4,
      (c) => sincronizarEdicao(c.id, c.status as ContentStatus),
    );

    // Planilhas de resultados no Drive: uma por cliente/mês (refaz a aba toda).
    const { data: rr } = await supabase
      .from("client_monthly_results")
      .select("client_id, week_start");
    const vistos = new Set<string>();
    const semanasUnicas: { client_id: string; week_start: string }[] = [];
    for (const r of rr ?? []) {
      if (!r.client_id || !r.week_start) continue;
      const [y, m, d] = r.week_start.split("-").map(Number);
      const quinta = new Date(y, m - 1, d + 3); // a quinta define o mês da aba
      const chave = `${r.client_id}|${quinta.getFullYear()}-${quinta.getMonth()}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      semanasUnicas.push({ client_id: r.client_id, week_start: r.week_start });
    }
    await emLotes(semanasUnicas, 3, (s) =>
      sincronizarResultadoSheets(s.client_id, s.week_start),
    );
  });

  revalidatePath("/configuracoes");
  return { ok: true };
}
