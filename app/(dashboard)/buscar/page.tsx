import { PageHeader } from "@/components/layout/page-header";
import { GlobalSearch } from "@/components/busca/global-search";
import { listSearchIndex } from "@/lib/data/search";

export const dynamic = "force-dynamic";

/** Busca global: acha qualquer cliente ou conteúdo pelo nome, na hora. */
export default async function BuscarPage() {
  const { clients, contents } = await listSearchIndex();

  return (
    <>
      <PageHeader
        titulo="Buscar"
        descricao="Ache qualquer cliente ou conteúdo pelo nome, na hora."
        icone="buscar"
        tom="indigo"
      />
      <GlobalSearch clients={clients} contents={contents} />
    </>
  );
}
