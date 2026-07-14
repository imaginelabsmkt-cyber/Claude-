import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

/**
 * Conteúdos — pautas, roteiros e pipeline de produção.
 * Entidade central do sistema. Listagem/kanban e formulário virão nas
 * próximas etapas.
 */
export default function ConteudosPage() {
  return (
    <>
      <PageHeader
        titulo="Conteúdos"
        descricao="Pautas, roteiros e acompanhamento do pipeline de produção"
        acao={<Button disabled>Novo conteúdo</Button>}
      />
      <EmptyState
        titulo="Nenhum conteúdo ainda"
        descricao="A listagem de conteúdos será conectada ao banco de dados nas próximas etapas."
      />
    </>
  );
}
