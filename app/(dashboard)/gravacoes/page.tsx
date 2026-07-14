import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";

/**
 * Gravações — recorte do pipeline com os conteúdos em captação.
 * Opera sobre Conteudo (status "gravacao") + registros de Gravacao.
 * NÃO é uma entidade nova: é uma visão especializada do fluxo.
 */
export default function GravacoesPage() {
  return (
    <>
      <PageHeader
        titulo="Gravações"
        descricao="Conteúdos em captação e agendamento de gravações"
      />
      <EmptyState
        titulo="Nenhuma gravação pendente"
        descricao="Aqui aparecerão os conteúdos aprovados aguardando gravação."
      />
    </>
  );
}
