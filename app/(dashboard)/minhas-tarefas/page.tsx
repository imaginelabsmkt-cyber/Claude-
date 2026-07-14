import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";

/**
 * Minhas tarefas — tarefas atribuídas ao usuário autenticado.
 * Opera sobre `contents` atribuídos ao usuário atual (planner_id,
 * recorder_id, editor_id ou publisher_id).
 */
export default function MinhasTarefasPage() {
  return (
    <>
      <PageHeader
        titulo="Minhas tarefas"
        descricao="Tarefas atribuídas a você, organizadas por status"
      />
      <EmptyState
        titulo="Você não tem tarefas"
        descricao="Suas tarefas atribuídas aparecerão aqui."
      />
    </>
  );
}
