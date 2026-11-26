"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { conferirDemanda, type ErroDeDemanda } from "@/lib/empresa/demandas";

/**
 * O que a tela de demandas grava.
 *
 * A conferência é a mesma função pura que a tela usa
 * (`conferirDemanda`), e não uma segunda cópia da regra aqui: duas
 * cópias viram duas regras no dia em que uma mudar.
 */

export interface ResultadoDaDemanda {
  ok: boolean;
  error?: string;
  erros?: ErroDeDemanda[];
  id?: string;
}

function revalidar() {
  revalidatePath("/interno/fila");
  revalidatePath("/interno");
}

/** Texto vazio vira null, para o banco não guardar string em branco. */
function limpar(v?: string | null): string | null {
  const t = (v ?? "").trim();
  return t ? t : null;
}

export interface DemandaDoFormulario {
  title: string;
  area: string;
  /** Id do profile, ou "" para "as duas". */
  assignedTo: string;
  dueDate: string;
  notes: string;
}

export async function salvarDemandaAction(
  entrada: DemandaDoFormulario,
  id?: string,
): Promise<ResultadoDaDemanda> {
  const erros = conferirDemanda({
    title: entrada.title,
    area: entrada.area,
    due_date: entrada.dueDate,
  });
  if (erros.length > 0) return { ok: false, erros };

  const supabase = createClient();
  const { data: sessao } = await supabase.auth.getUser();

  const linha = {
    title: entrada.title.trim(),
    area: entrada.area,
    assigned_to: limpar(entrada.assignedTo),
    due_date: limpar(entrada.dueDate),
    notes: limpar(entrada.notes),
  };

  if (id) {
    const { error } = await supabase
      .from("company_tasks")
      .update(linha)
      .eq("id", id);
    if (error) return { ok: false, error: "Não foi possível salvar." };
    revalidar();
    return { ok: true, id };
  }

  const { data, error } = await supabase
    .from("company_tasks")
    .insert({ ...linha, created_by: sessao.user?.id ?? null })
    .select("id")
    .single();

  if (error) return { ok: false, error: "Não foi possível criar a demanda." };
  revalidar();
  return { ok: true, id: (data as { id: string }).id };
}

/**
 * Marca como concluída, ou desfaz.
 *
 * Desfazer é voltar `done_at` para null, e não apagar e criar de
 * novo: quem marcou por engano quer a mesma demanda de volta, com o
 * prazo e a observação que ela tinha.
 */
export async function concluirDemandaAction(
  id: string,
  concluida: boolean,
): Promise<ResultadoDaDemanda> {
  const supabase = createClient();
  const { error } = await supabase
    .from("company_tasks")
    .update({ done_at: concluida ? new Date().toISOString() : null })
    .eq("id", id);

  if (error) return { ok: false, error: "Não foi possível salvar." };
  revalidar();
  return { ok: true, id };
}

export async function excluirDemandaAction(
  id: string,
): Promise<ResultadoDaDemanda> {
  const supabase = createClient();
  const { error } = await supabase.from("company_tasks").delete().eq("id", id);
  if (error) return { ok: false, error: "Não foi possível excluir." };
  revalidar();
  return { ok: true, id };
}
