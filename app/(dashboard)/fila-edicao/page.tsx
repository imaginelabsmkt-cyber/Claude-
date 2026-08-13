import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EditQueue } from "@/components/fila-edicao/edit-queue";
import { listContents, listAllClients } from "@/lib/data/contents";
import { ordenarFilaFinal, hojeISO, ehCapa, ehArte } from "@/lib/rules/contents";
import type { ContentStatus } from "@/types";

export const dynamic = "force-dynamic";

const STATUS_FILA: ContentStatus[] = [
  "Gravado",
  "Fila de edição",
  "Em edição",
  "Ajustes",
];

/** Fila de edição — foco na Fran, com ordenação automática e manual. */
export default async function FilaEdicaoPage() {
  const [todos, clientes] = await Promise.all([
    listContents({}),
    listAllClients(),
  ]);

  // Só EDIÇÃO DE VÍDEO (Fran). Capas e artes (Vitória) ficam na aba Artes.
  const itens = ordenarFilaFinal(
    todos.filter(
      (c) => STATUS_FILA.includes(c.status) && !ehCapa(c) && !ehArte(c.format),
    ),
  );

  return (
    <>
      <PageHeader
        titulo="Fila de edição"
        descricao="Ordenada por urgência. Marque em cada vídeo o dia de editar (vira uma tarefa no Google; a hora você põe lá)."
        icone="edicao"
        tom="ambar"
      />

      {itens.length === 0 ? (
        <EmptyState
          titulo="Fila de edição vazia"
          descricao="Conteúdos gravados e em edição aparecerão aqui."
        />
      ) : (
        <EditQueue itens={itens} clientes={clientes} hoje={hojeISO()} />
      )}
    </>
  );
}
