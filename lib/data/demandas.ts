import { createClient } from "@/lib/supabase/server";
import type { Demanda, AreaDaDemanda } from "@/lib/empresa/demandas";

/**
 * As demandas internas, do banco para a tela.
 *
 * Traz TODAS, abertas e concluídas, numa consulta só: a fila precisa
 * das abertas e o rodapé precisa das concluídas da semana. São
 * poucas dezenas de linhas, e duas consultas seriam duas verdades
 * possíveis sobre o mesmo instante.
 */
export async function listarDemandas(): Promise<Demanda[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("company_tasks")
    .select("*, responsavel:profiles!company_tasks_assigned_to_fkey(name)")
    .order("due_date", { ascending: true, nullsFirst: false });

  return ((data ?? []) as unknown as Record<string, unknown>[]).map((t) => ({
    id: t.id as string,
    title: t.title as string,
    area: t.area as AreaDaDemanda,
    responsavel:
      ((t.responsavel as { name?: string } | null)?.name as string | null) ??
      null,
    due_date: (t.due_date as string | null) ?? null,
    notes: (t.notes as string | null) ?? null,
    done_at: (t.done_at as string | null) ?? null,
  }));
}

/** Quem pode ser responsável por uma demanda. */
export async function listarResponsaveis(): Promise<
  { id: string; nome: string }[]
> {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, name")
    .order("name");

  return (data ?? []).map((p) => ({
    id: p.id as string,
    nome: p.name as string,
  }));
}
