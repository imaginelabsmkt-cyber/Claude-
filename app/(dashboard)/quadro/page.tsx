import { redirect } from "next/navigation";

/**
 * O Quadro (Kanban) foi removido do menu por ser redundante com as telas
 * especializadas (Gravações, Fila de edição, Artes) e com Minhas tarefas.
 * Mantemos a rota redirecionando para Conteúdos, para não quebrar links antigos.
 */
export default function QuadroPage() {
  redirect("/conteudos");
}
