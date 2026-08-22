import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ContentsToolbar } from "@/components/contents/contents-toolbar";
import { EditableContentsTable } from "@/components/contents/editable-contents-table";
import {
  listContents,
  listClientOptions,
  listProfiles,
  listReferenceMonths,
  type FiltrosConteudo,
} from "@/lib/data/contents";
import { estaAtrasado } from "@/lib/rules/contents";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: FiltrosConteudo & { atrasado?: string };
}

/** Página geral de conteúdos: filtros, busca e tabela. */
export default async function ConteudosPage({ searchParams }: PageProps) {
  const [contentsRaw, clientes, perfis, meses] = await Promise.all([
    listContents(searchParams),
    listClientOptions(),
    listProfiles(),
    listReferenceMonths(),
  ]);

  // Filtro derivado "somente atrasados" (regra calculada, não no banco).
  const contents =
    searchParams.atrasado === "1"
      ? contentsRaw.filter((c) => estaAtrasado(c))
      : contentsRaw;

  return (
    <>
      <PageHeader
        titulo="Conteúdos"
        descricao="Pautas, roteiros e acompanhamento do pipeline de produção"
        icone="conteudos"
        tom="indigo"
        acao={
          <div className="flex flex-wrap gap-2">
            <Link href="/conteudos/importar">
              <Button variante="secundaria">Importar planejamento</Button>
            </Link>
            <Link href="/conteudos/novo">
              <Button>Novo conteúdo</Button>
            </Link>
          </div>
        }
      />

      <ContentsToolbar clientes={clientes} meses={meses} />

      <EditableContentsTable
        contents={contents}
        clientes={clientes}
        perfis={perfis}
        acaoVazio={
          <Link href="/conteudos/novo">
            <Button>+ Novo conteúdo</Button>
          </Link>
        }
      />
    </>
  );
}
