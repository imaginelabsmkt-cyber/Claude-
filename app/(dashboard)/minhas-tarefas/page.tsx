import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";

/**
 * Minhas tarefas — tarefas atribuídas ao usuário autenticado.
 * Opera sobre a entidade Tarefa (filtrada por responsavel_id).
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
