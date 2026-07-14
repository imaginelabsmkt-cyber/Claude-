import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { RecordingCard } from "@/components/gravacoes/recording-card";
import { RecordingsFilters } from "@/components/gravacoes/recordings-filters";
import {
  listContents,
  listAllClients,
  listReferenceMonths,
  type FiltrosConteudo,
} from "@/lib/data/contents";
import { classificarGravacao, type GrupoGravacao } from "@/lib/rules/contents";
import type { Content } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: FiltrosConteudo & { atrasado?: string };
}

const GRUPOS: { chave: GrupoGravacao; titulo: string }[] = [
  { chave: "atrasada", titulo: "Gravações atrasadas" },
  { chave: "semana", titulo: "Gravações desta semana" },
  { chave: "proxima", titulo: "Próximas gravações" },
  { chave: "gravada", titulo: "Já gravados" },
];

/** Página de Gravações — foco na Fran. */
export default async function GravacoesPage({ searchParams }: PageProps) {
  const [todos, clientes, meses] = await Promise.all([
    listContents(searchParams),
    listAllClients(),
    listReferenceMonths(),
  ]);

  const clientesById = new Map(clientes.map((c) => [c.id, c]));

  // Apenas conteúdos que precisam de gravação (e não cancelados).
  let itens = todos.filter(
    (c) => c.requires_recording && c.status !== "Cancelado",
  );

  // Classificação em grupos
  const grupos: Record<GrupoGravacao, Content[]> = {
    atrasada: [],
    semana: [],
    proxima: [],
    gravada: [],
  };
  for (const c of itens) grupos[classificarGravacao(c)].push(c);

  // Filtro "somente atrasados"
  const soAtrasados = searchParams.atrasado === "1";

  const totalVisivel = soAtrasados
    ? grupos.atrasada.length
    : itens.length;

  return (
    <>
      <PageHeader
        titulo="Gravações"
        descricao="Conteúdos que precisam de gravação, por situação"
      />

      <RecordingsFilters clientes={clientes} meses={meses} />

      {totalVisivel === 0 ? (
        <EmptyState
          titulo="Nenhuma gravação encontrada"
          descricao="Ajuste os filtros ou marque conteúdos como 'precisa de gravação'."
        />
      ) : (
        <div className="space-y-8">
          {GRUPOS.filter((g) => !soAtrasados || g.chave === "atrasada").map(
            (g) => {
              const lista = grupos[g.chave];
              return (
                <section key={g.chave}>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                    {g.titulo}
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {lista.length}
                    </span>
                  </h2>
                  {lista.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-xs text-gray-500">
                      Nenhum conteúdo aqui.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      {lista.map((c) => (
                        <RecordingCard
                          key={c.id}
                          content={c}
                          clienteNome={clientesById.get(c.client_id)?.name ?? "—"}
                          cor={clientesById.get(c.client_id)?.color}
                          atrasada={g.chave === "atrasada"}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            },
          )}
        </div>
      )}
    </>
  );
}
