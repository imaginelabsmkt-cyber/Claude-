import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { RecordingCard } from "@/components/gravacoes/recording-card";
import { RecordingsFilters } from "@/components/gravacoes/recordings-filters";
import { AgendarLoteButton } from "@/components/gravacoes/agendar-lote-button";
import { GravadosList } from "@/components/gravacoes/gravados-list";
import { AAgendarList } from "@/components/gravacoes/a-agendar-list";
import {
  listContents,
  listAllClients,
  listClientOptions,
  listReferenceMonths,
  type FiltrosConteudo,
} from "@/lib/data/contents";
import {
  classificarGravacao,
  estaGravado,
  ehArte,
  ORDEM_STATUS,
} from "@/lib/rules/contents";
import type { Content } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: FiltrosConteudo & { atrasado?: string };
}

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

  // Conteúdos que precisam de gravação, até a etapa "Gravado". Depois de entrar
  // na edição/postagem, saem daqui (aparecem na Fila de edição/Postagens).
  const itens = todos.filter(
    (c) =>
      c.requires_recording &&
      ORDEM_STATUS[c.status] <= ORDEM_STATUS["Gravado"] &&
      ORDEM_STATUS[c.status] >= 0,
  );

  // Candidatos a agendar em lote: ainda sem data e ANTES da etapa "Gravado".
  // (Não exige "precisa de gravação": muitos vídeos ainda não foram marcados,
  // e é justamente aqui que se agenda. Já na Fila de edição/edição em diante é
  // porque já foi gravado — esses não aparecem.) Exclui arte (não é gravação
  // de vídeo), Pausado e Cancelado.
  const candidatos = todosSemFiltro.filter(
    (c) =>
      !c.recording_date &&
      !ehArte(c.format) &&
      ORDEM_STATUS[c.status] >= 0 &&
      ORDEM_STATUS[c.status] < ORDEM_STATUS["Gravado"],
  );

  // Agrupa: só quem tem DATA vira card. Sem data => lista compacta "A agendar".
  const semana: Content[] = [];
  const proxima: Content[] = [];
  const aAgendar: Content[] = [];
  const gravada: Content[] = [];
  for (const c of itens) {
    if (estaGravado(c.status)) gravada.push(c);
    else if (!c.recording_date) aAgendar.push(c);
    else if (classificarGravacao(c) === "semana") semana.push(c);
    else proxima.push(c);
  }

  const nomeCli = (c: Content) => clientesById.get(c.client_id)?.name ?? "—";
  const corCli = (c: Content) => clientesById.get(c.client_id)?.color;

  const Cards = ({ titulo, lista }: { titulo: string; lista: Content[] }) => (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
        {titulo}
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {lista.length}
        </span>
      </h2>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {lista.map((c) => (
          <RecordingCard
            key={c.id}
            content={c}
            clienteNome={nomeCli(c)}
            cor={corCli(c)}
          />
        ))}
      </div>
    </section>
  );

  return (
    <>
      <PageHeader
        titulo="Gravações"
        descricao="Conteúdos que precisam de gravação, por situação"
        icone="gravacoes"
        tom="ambar"
        acao={
          <AgendarLoteButton clientes={clientOptions} candidatos={candidatos} />
        }
      />

      <RecordingsFilters clientes={clientes} meses={meses} />

      {itens.length === 0 ? (
        <EmptyState
          titulo="Nenhuma gravação encontrada"
          descricao="Ajuste os filtros ou marque conteúdos como 'precisa de gravação'."
        />
      ) : (
        <div className="space-y-8">
          {semana.length > 0 ? (
            <Cards titulo="Gravações desta semana" lista={semana} />
          ) : null}
          {proxima.length > 0 ? (
            <Cards titulo="Próximas gravações" lista={proxima} />
          ) : null}
          {aAgendar.length > 0 ? (
            <AAgendarList
              rows={aAgendar.map((c) => ({
                id: c.id,
                title: c.title,
                clienteNome: nomeCli(c),
                cor: corCli(c),
              }))}
            />
          ) : null}
          {gravada.length > 0 ? (
            <GravadosList
              rows={gravada.map((c) => ({
                id: c.id,
                title: c.title,
                clienteNome: nomeCli(c),
                cor: corCli(c),
                recording_date: c.recording_date,
              }))}
            />
          ) : null}
        </div>
      )}
    </>
  );
}
