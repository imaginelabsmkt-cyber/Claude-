import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";

/**
 * Gravações — recorte do pipeline com os conteúdos em captação.
 * Opera sobre `contents` com status "Aguardando gravação"/"Gravado"
 * (ou requires_recording = true). NÃO é entidade nova: é uma visão do fluxo.
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
