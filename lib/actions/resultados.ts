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

const MES_RE = /^\d{4}-\d{2}$/;

/**
 * Equipe salva os números de tráfego do mês (métricas + explicação). Upsert por
 * cliente/mês, preservando o que o cliente já respondeu.
 */
export async function salvarResultadosEquipeAction(
  clientId: string,
  month: string,
  metrics: MetricaTrafego[],
  teamNote: string,
): Promise<ResultadoResult> {
  if (!clientId || !MES_RE.test(month)) {
    return { ok: false, error: "Dados inválidos." };
  }
  if (!(await usuarioAtualId())) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }
  // Limpa métricas (rótulo obrigatório) e limita tamanho.
  const limpas = (metrics ?? [])
    .map((m) => ({
      label: (m.label ?? "").trim().slice(0, 60),
      value: (m.value ?? "").trim().slice(0, 60),
    }))
    .filter((m) => m.label || m.value);

  const supabase = createClient();
  const { error } = await supabase
    .from("client_monthly_results")
    .upsert(
      {
        client_id: clientId,
        month,
        metrics: limpas,
        team_note: teamNote.trim().slice(0, 4000) || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id,month" },
    );
  if (error) return { ok: false, error: "Não foi possível salvar." };

  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}

/**
 * Cliente responde os resultados dele pelo painel (link secreto). Valida o
 * token, grava só os campos do cliente e avisa a coordenação. Sem sessão.
 */
export async function enviarResultadoClienteAction(
  token: string,
  month: string,
  dados: { closedCount: string; sources: string; comment: string },
): Promise<ResultadoResult> {
  if (!token || !MES_RE.test(month)) {
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

  const { error } = await admin
    .from("client_monthly_results")
    .upsert(
      {
        client_id: cliente.id,
        month,
        closed_count: closed,
        sources: dados.sources.trim().slice(0, 500) || null,
        client_comment: dados.comment.trim().slice(0, 2000) || null,
        client_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id,month" },
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
        ? `${cliente.name} fechou ${closed} este mês.`
        : `${cliente.name} respondeu os resultados do mês.`;
    for (const p of coord ?? []) {
      await enviarPushParaUsuario(admin, p.id, {
        title: "📈 Resultado do cliente",
        body: resumo,
        url: `/clientes/${cliente.id}`,
        tag: `resultado-${cliente.id}-${month}`,
      });
    }
  } catch {
    // ignora falha de push
  }

  return { ok: true };
}
