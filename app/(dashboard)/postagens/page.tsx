import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";

/**
 * Postagens — agendamento e publicação nas redes.
 * Opera sobre `contents` com status "Agendado"/"Publicado"
 * (campos planned_date, actual_post_date, published_url).
 */
export default function PostagensPage() {
  return (
    <>
      <PageHeader
        titulo="Postagens"
        descricao="Agendamento e acompanhamento das publicações"
      />
      <EmptyState
        titulo="Nenhuma postagem agendada"
        descricao="Aqui aparecerão os conteúdos agendados e publicados."
      />
    </>
  );
}
