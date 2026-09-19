import { PageHeader } from "@/components/layout/page-header";
import { DemandsBoard } from "@/components/demandas/demands-board";
import { listDemands } from "@/lib/data/demands";
import { listProfiles, listClientOptions } from "@/lib/data/contents";

export const dynamic = "force-dynamic";

/** Demandas gerais do time, tarefas fora do fluxo de conteúdo. */
export default async function DemandasPage() {
  const [demands, profiles, clientes] = await Promise.all([
    listDemands(),
    listProfiles(),
    listClientOptions(),
  ]);

  return (
    <>
      <PageHeader
        titulo="Demandas"
        descricao="Tarefas gerais do time (fora do fluxo de conteúdo). Crie, atribua e acompanhe."
        icone="demandas"
        tom="indigo"
      />
      <DemandsBoard demands={demands} profiles={profiles} clientes={clientes} />
    </>
  );
}
