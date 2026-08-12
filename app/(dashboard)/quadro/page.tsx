import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/contents/kanban-board";
import { EmptyState } from "@/components/shared/empty-state";
import { listContents, listClientOptions } from "@/lib/data/contents";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { cliente?: string };
}

/** Quadro Kanban da produção — colunas por fase, arrastar para mudar o status. */
export default async function QuadroPage({ searchParams }: PageProps) {
  const [contents, clientes] = await Promise.all([
    listContents(
      searchParams.cliente ? { client_id: searchParams.cliente } : {},
    ),
    listClientOptions(),
  ]);

  return (
    <>
      <PageHeader
        titulo="Quadro"
        descricao="Produção por fase. Arraste um card para mudar o status."
        acao={
          <Link href="/conteudos/novo">
            <Button>+ Novo conteúdo</Button>
          </Link>
        }
      />

      {contents.length === 0 ? (
        <EmptyState
          titulo="Nenhum conteúdo no quadro"
          descricao="Cadastre ou importe um planejamento para começar."
          acao={
            <Link href="/conteudos/importar">
              <Button>Importar planejamento</Button>
            </Link>
          }
        />
      ) : (
        <KanbanBoard contents={contents} clientes={clientes} />
      )}
    </>
  );
}
