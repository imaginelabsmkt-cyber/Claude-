"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { usuarioAtualId } from "@/lib/auth";
import { enviarPushParaUsuario } from "@/lib/push/send";
import type { MetricaTrafego } from "@/types";

export interface ResultadoResult {
  ok: boolean;
  error?: string;
}

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/; // segunda-feira da semana

/**
 * Equipe salva os números de tráfego da SEMANA (métricas + explicação). Upsert
 * por cliente/semana, preservando o que o cliente já respondeu.
 */
export async function salvarResultadosEquipeAction(
  clientId: string,
  weekStart: string,
  metrics: MetricaTrafego[],
  teamNote: string,
): Promise<ResultadoResult> {
  if (!clientId || !DATA_RE.test(weekStart)) {
    return { ok: false, error: "Dados inválidos." };
  }
  if (!(await usuarioAtualId())) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }
  const limpas = (metrics ?? [])
    .map((m) => ({
      label: (m.label ?? "").trim().slice(0, 60),
      value: (m.value ?? "").trim().slice(0, 60),
    }))
    .filter((m) => m.label || m.value);

  const supabase = createClient();
  const { error } = await supabase.from("client_monthly_results").upsert(
    {
      client_id: clientId,
      week_start: weekStart,
      metrics: limpas,
      team_note: teamNote.trim().slice(0, 4000) || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id,week_start" },
  );
  if (error) return { ok: false, error: "Não foi possível salvar." };

  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}

/**
 * Salva (ou remove) a planilha de tráfego extraída de um Excel/CSV. grade=null
 * remove. Preserva o resto da linha da semana.
 */
export async function salvarPlanilhaTrafegoAction(
  clientId: string,
  weekStart: string,
  grade: string[][] | null,
  fileName: string | null,
): Promise<ResultadoResult> {
  if (!clientId || !DATA_RE.test(weekStart)) {
    return { ok: false, error: "Dados inválidos." };
  }
  if (!(await usuarioAtualId())) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }
  const supabase = createClient();
  const { error } = await supabase.from("client_monthly_results").upsert(
    {
      client_id: clientId,
      week_start: weekStart,
      traffic_table: grade,
      traffic_file_name: grade ? fileName : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id,week_start" },
  );
  if (error) return { ok: false, error: "Não foi possível salvar a planilha." };

  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}

/**
 * Cliente responde os resultados dele pelo painel (link secreto). Valida o
 * token, grava só os campos do cliente na SEMANA e avisa a coordenação.
 */
export async function enviarResultadoClienteAction(
  token: string,
  weekStart: string,
  dados: { closedCount: string; sources: string; comment: string },
): Promise<ResultadoResult> {
  if (!token || !DATA_RE.test(weekStart)) {
    return { ok: false, error: "Link inválido." };
  }
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Indisponível no momento." };

  const { data: cliente } = await admin
    .from("clients")
    .select("id, name")
    .eq("portal_token", token)
    .eq("portal_enabled", true)
    .eq("is_internal", false)
    .maybeSingle();
  if (!cliente) return { ok: false, error: "Link indisponível." };

  const n = parseInt(dados.closedCount, 10);
  const closed = Number.isFinite(n) && n >= 0 ? n : null;

  const { error } = await admin.from("client_monthly_results").upsert(
    {
      client_id: cliente.id,
      week_start: weekStart,
      closed_count: closed,
      sources: dados.sources.trim().slice(0, 500) || null,
      client_comment: dados.comment.trim().slice(0, 2000) || null,
      client_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id,week_start" },
  );
  if (error) return { ok: false, error: "Não foi possível enviar." };

  // Avisa a coordenação (best-effort, não bloqueia).
  try {
    const { data: coord } = await admin
      .from("profiles")
      .select("id")
      .in("role", ["planner", "admin", "producer"]);
    const resumo =
      closed != null
        ? `${cliente.name} fechou ${closed} esta semana.`
        : `${cliente.name} respondeu os resultados da semana.`;
    for (const p of coord ?? []) {
      await enviarPushParaUsuario(admin, p.id, {
        title: "📈 Resultado do cliente",
        body: resumo,
        url: `/clientes/${cliente.id}`,
        tag: `resultado-${cliente.id}-${weekStart}`,
      });
    }
  } catch {
    // ignora falha de push
  }

  return { ok: true };
}
