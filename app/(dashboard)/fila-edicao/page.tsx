import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";

/**
 * Fila de edição — recorte do pipeline com os conteúdos aguardando edição.
 * Opera sobre `contents` com status "Fila de edição"/"Em edição".
 * NÃO é entidade nova: é uma visão do fluxo (evita duplicação).
 */
export default function FilaEdicaoPage() {
  return (
    <>
      <PageHeader
        titulo="Fila de edição"
        descricao="Conteúdos gravados aguardando edição e finalização"
      />
      <EmptyState
        titulo="Fila de edição vazia"
        descricao="Aqui aparecerão os conteúdos prontos para edição."
      />
    </>
  );
}
