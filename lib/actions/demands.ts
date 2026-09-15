"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { usuarioAtualId } from "@/lib/auth";
import { DEMAND_STATUS_OPTIONS, type DemandStatus } from "@/types";
import { sincronizarDemanda } from "@/lib/google/demands-sync";
import { aposResposta } from "@/lib/after";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

function revalidar() {
  revalidatePath("/demandas");
  revalidatePath("/minhas-tarefas");
  revalidatePath("/dashboard");
}

const DATA_OK = (v: string | null | undefined) =>
  v == null || v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v);

export interface NovaDemanda {
  title: string;
  description?: string | null;
  category?: string | null;
  assignee_ids?: string[];
  client_id?: string | null;
  due_date?: string | null;
}

/** Cria uma demanda geral. */
export async function criarDemandaAction(
  input: NovaDemanda,
): Promise<ActionResult> {
  const userId = await usuarioAtualId();
  if (!userId) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const title = (input.title ?? "").trim();
  if (!title) return { ok: false, error: "Dê um título para a demanda." };
  if (!DATA_OK(input.due_date)) return { ok: false, error: "Prazo inválido." };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("demands")
    .insert({
      title: title.slice(0, 300),
      description: (input.description ?? "").trim() || null,
      category: (input.category ?? "").trim() || null,
      assignee_ids: (input.assignee_ids ?? []).filter(Boolean),
      client_id: input.client_id || null,
      due_date: input.due_date || null,
      status: "A fazer",
      created_by: userId,
    })
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: "Não foi possível criar a demanda." };
  if (data?.id) {
    const novoId = data.id;
    aposResposta(() => sincronizarDemanda(novoId)); // vira tarefa no Google
  }
  revalidar();
  return { ok: true, id: data?.id };
}

export interface DemandaPatch {
  title?: string;
  description?: string | null;
  category?: string | null;
  assignee_ids?: string[];
  client_id?: string | null;
  due_date?: string | null;
  status?: DemandStatus;
}

/** Atualiza campos de uma demanda (título, área, responsáveis, prazo, status…). */
export async function atualizarDemandaAction(
  id: string,
  patch: DemandaPatch,
): Promise<ActionResult> {
  if (!id) return { ok: false, error: "Demanda inválida." };
  if (!(await usuarioAtualId())) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }

  const dados: Record<string, unknown> = {};
  if ("title" in patch) {
    const t = (patch.title ?? "").trim();
    if (!t) return { ok: false, error: "O título não pode ficar vazio." };
    dados.title = t.slice(0, 300);
  }
  if ("description" in patch)
    dados.description = (patch.description ?? "").trim() || null;
  if ("category" in patch)
    dados.category = (patch.category ?? "").trim() || null;
  if ("assignee_ids" in patch)
    dados.assignee_ids = (patch.assignee_ids ?? []).filter(Boolean);
  if ("client_id" in patch) dados.client_id = patch.client_id || null;
  if ("due_date" in patch) {
    if (!DATA_OK(patch.due_date)) return { ok: false, error: "Prazo inválido." };
    dados.due_date = patch.due_date || null;
  }
  if ("status" in patch) {
    if (!DEMAND_STATUS_OPTIONS.includes(patch.status as DemandStatus)) {
      return { ok: false, error: "Status inválido." };
    }
    dados.status = patch.status;
  }
  if (Object.keys(dados).length === 0) {
    return { ok: false, error: "Nada para salvar." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("demands").update(dados).eq("id", id);
  if (error) return { ok: false, error: "Não foi possível salvar." };
  aposResposta(() => sincronizarDemanda(id)); // reflete no Google Tarefas
  revalidar();
  return { ok: true, id };
}

/**
 * Arquiva uma demanda (soft-delete): some da lista ativa, mas fica guardada
 * no sistema para o relatório do que foi feito por cliente. A tarefa no Google
 * também permanece, de registro.
 */
export async function arquivarDemandaAction(id: string): Promise<ActionResult> {
  if (!(await usuarioAtualId())) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("demands")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: "Não foi possível arquivar." };
  revalidar();
  return { ok: true, id };
}
