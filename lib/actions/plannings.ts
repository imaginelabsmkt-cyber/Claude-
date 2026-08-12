"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { usuarioAtualId } from "@/lib/auth";
import { sincronizarPlanejamentoGoogle } from "@/lib/google/planning-sync";
import { PLANNING_STATUS_OPTIONS } from "@/types";
import type { PlanningInsert } from "@/types";
import type { ActionResult } from "@/lib/actions/contents";

export interface PlanningPatch {
  status?: string;
  meeting_date?: string | null;
  meeting_time?: string | null;
  delivery_deadline?: string | null;
  notes?: string | null;
}

const ehData = (v: string | null | undefined) =>
  v == null || v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v);

/**
 * Cria ou atualiza o planejamento de um cliente num mês (por cliente+mês).
 * Qualquer campo alterado já cria o registro se ainda não existir.
 */
export async function salvarPlanningAction(
  clientId: string,
  referenceMonth: string,
  patch: PlanningPatch,
): Promise<ActionResult> {
  if (!clientId || !/^\d{4}-\d{2}$/.test(referenceMonth)) {
    return { ok: false, error: "Dados inválidos." };
  }
  if (!(await usuarioAtualId())) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }
  if (patch.status && !PLANNING_STATUS_OPTIONS.includes(patch.status)) {
    return { ok: false, error: "Status inválido." };
  }
  if (!ehData(patch.meeting_date) || !ehData(patch.delivery_deadline)) {
    return { ok: false, error: "Data inválida." };
  }

  const dados: PlanningInsert = {
    client_id: clientId,
    reference_month: referenceMonth,
    updated_at: new Date().toISOString(),
  };
  if ("status" in patch) dados.status = patch.status;
  if ("meeting_date" in patch) dados.meeting_date = patch.meeting_date || null;
  if ("meeting_time" in patch) dados.meeting_time = patch.meeting_time || null;
  if ("delivery_deadline" in patch)
    dados.delivery_deadline = patch.delivery_deadline || null;
  if ("notes" in patch) dados.notes = patch.notes ?? null;

  const supabase = createClient();
  const { error } = await supabase
    .from("plannings")
    .upsert(dados, { onConflict: "client_id,reference_month" });
  if (error) return { ok: false, error: "Não foi possível salvar." };

  // Se mexeu na reunião ou no prazo de entrega, sincroniza com o Google
  // (reunião = evento, prazo = tarefa).
  if ("meeting_date" in patch || "meeting_time" in patch || "delivery_deadline" in patch) {
    const { data: p } = await supabase
      .from("plannings")
      .select("id")
      .eq("client_id", clientId)
      .eq("reference_month", referenceMonth)
      .maybeSingle();
    if (p?.id) await sincronizarPlanejamentoGoogle(p.id);
  }

  revalidatePath("/planejamentos");
  return { ok: true };
}
