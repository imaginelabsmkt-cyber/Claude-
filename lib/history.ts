import { createClient } from "@/lib/supabase/server";
import { formatarData } from "@/lib/utils";
import type { Content } from "@/types";

export interface CampoAlterado {
  field: string;
  old: string | null;
  new: string | null;
}

/**
 * Registra alterações em content_history. Só grava os campos que de fato
 * mudaram. O usuário é obtido da sessão atual. O histórico é imutável:
 * nunca é editado, apenas inserido.
 */
export async function registrarHistorico(
  contentId: string,
  mudancas: CampoAlterado[],
): Promise<void> {
  const relevantes = mudancas.filter(
    (m) => (m.old ?? "") !== (m.new ?? ""),
  );
  if (relevantes.length === 0) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("content_history").insert(
    relevantes.map((m) => ({
      content_id: contentId,
      user_id: user?.id ?? null,
      field_changed: m.field,
      old_value: m.old,
      new_value: m.new,
    })),
  );
  // O histórico é auditoria: se a inserção falhar, ao menos registra no log
  // do servidor em vez de perder a alteração silenciosamente.
  if (error) {
    console.error("Falha ao registrar histórico:", error.message);
  }
}

const fmtData = (v: string | null) => (v ? formatarData(v) : "—");

/**
 * Compara o conteúdo antigo com os novos valores e retorna as mudanças
 * rastreadas (status, prioridade, datas, responsáveis, prazos, ajustes).
 * `nomePorId` resolve os ids de responsável para nomes legíveis.
 */
export function diffConteudo(
  antigo: Content,
  novo: Partial<Content>,
  nomePorId: Map<string, string>,
): CampoAlterado[] {
  const nome = (id: string | null | undefined) =>
    id ? (nomePorId.get(id) ?? "—") : "—";

  const mudancas: CampoAlterado[] = [
    { field: "Status", old: antigo.status, new: novo.status ?? antigo.status },
    { field: "Prioridade", old: antigo.priority, new: novo.priority ?? antigo.priority },
    { field: "Data prevista", old: fmtData(antigo.planned_date), new: fmtData(novo.planned_date ?? null) },
    {
      field: "Semana prevista",
      old: antigo.planned_week != null ? String(antigo.planned_week) : "—",
      new: novo.planned_week != null ? String(novo.planned_week) : "—",
    },
    { field: "Responsável (planejamento)", old: nome(antigo.planner_id), new: nome(novo.planner_id) },
    { field: "Responsável (gravação)", old: nome(antigo.recorder_id), new: nome(novo.recorder_id) },
    { field: "Responsável (edição)", old: nome(antigo.editor_id), new: nome(novo.editor_id) },
    { field: "Responsável (postagem)", old: nome(antigo.publisher_id), new: nome(novo.publisher_id) },
    { field: "Prazo de gravação", old: fmtData(antigo.recording_deadline), new: fmtData(novo.recording_deadline ?? null) },
    { field: "Prazo de edição", old: fmtData(antigo.editing_deadline), new: fmtData(novo.editing_deadline ?? null) },
    {
      field: "Quantidade de ajustes",
      old: String(antigo.revision_count),
      new: String(novo.revision_count ?? antigo.revision_count),
    },
  ];

  return mudancas.filter((m) => (m.old ?? "") !== (m.new ?? ""));
}
