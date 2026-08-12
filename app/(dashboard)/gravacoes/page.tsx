import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { RecordingCard } from "@/components/gravacoes/recording-card";
import { RecordingsFilters } from "@/components/gravacoes/recordings-filters";
import { AgendarLoteButton } from "@/components/gravacoes/agendar-lote-button";
import { GravadosList } from "@/components/gravacoes/gravados-list";
import {
  listContents,
  listAllClients,
  listClientOptions,
  listReferenceMonths,
  type FiltrosConteudo,
} from "@/lib/data/contents";
import { classificarGravacao, type GrupoGravacao } from "@/lib/rules/contents";
import type { Content } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: FiltrosConteudo & { atrasado?: string };
}

// Não existe "gravação atrasada": o que não está desta semana entra em próximas.
const GRUPOS: { chave: GrupoGravacao; titulo: string }[] = [
  { chave: "semana", titulo: "Gravações desta semana" },
  { chave: "proxima", titulo: "Próximas gravações" },
  { chave: "gravada", titulo: "Já gravados" },
];

/** Página de Gravações — foco na Fran. */
export default async function GravacoesPage({ searchParams }: PageProps) {
  const [todos, todosSemFiltro, clientes, clientOptions, meses] =
    await Promise.all([
      listContents(searchParams),
      listContents({}),
      listAllClients(),
      listClientOptions(),
      listReferenceMonths(),
    ]);

  const clientesById = new Map(clientes.map((c) => [c.id, c]));

  // Apenas conteúdos que precisam de gravação (e não cancelados).
  const itens = todos.filter(
    (c) => c.requires_recording && c.status !== "Cancelado",
  );

  // Candidatos a agendar em lote: ainda sem data de gravação, não finalizados.
  const candidatos = todosSemFiltro.filter(
    (c) =>
      !c.recording_date &&
      c.status !== "Publicado" &&
      c.status !== "Cancelado",
  );

  // Classificação em grupos ("atrasada" cai em "próxima": não há atraso aqui).
  const grupos: Record<GrupoGravacao, Content[]> = {
    atrasada: [],
    semana: [],
    proxima: [],
    gravada: [],
  };
  for (const c of itens) {
    const g = classificarGravacao(c);
    grupos[g === "atrasada" ? "proxima" : g].push(c);
  }

  const totalVisivel = itens.length;

  return (
    <>
      <PageHeader
        titulo="Gravações"
        descricao="Conteúdos que precisam de gravação, por situação"
        acao={
          <AgendarLoteButton clientes={clientOptions} candidatos={candidatos} />
        }
      />

      <RecordingsFilters clientes={clientes} meses={meses} />

      {totalVisivel === 0 ? (
        <EmptyState
          titulo="Nenhuma gravação encontrada"
          descricao="Ajuste os filtros ou marque conteúdos como 'precisa de gravação'."
        />
      ) : (
        <div className="space-y-8">
          {GRUPOS.map((g) => {
            const lista = grupos[g.chave];
            if (lista.length === 0) return null;

            // "Já gravados" fica como lista compacta e recolhível.
            if (g.chave === "gravada") {
              return (
                <GravadosList
                  key={g.chave}
                  rows={lista.map((c) => ({
                    id: c.id,
                    title: c.title,
                    clienteNome: clientesById.get(c.client_id)?.name ?? "—",
                    cor: clientesById.get(c.client_id)?.color,
                    recording_date: c.recording_date,
                  }))}
                />
              );
            }

            return (
              <section key={g.chave}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  {g.titulo}
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {lista.length}
                  </span>
                </h2>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {lista.map((c) => (
                    <RecordingCard
                      key={c.id}
                      content={c}
                      clienteNome={clientesById.get(c.client_id)?.name ?? "—"}
                      cor={clientesById.get(c.client_id)?.color}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
