import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ContentsToolbar } from "@/components/contents/contents-toolbar";
import { ContentsTable } from "@/components/contents/contents-table";
import {
  listContents,
  listClientOptions,
  listProfiles,
  listReferenceMonths,
  type FiltrosConteudo,
} from "@/lib/data/contents";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: FiltrosConteudo;
}

/** Página geral de conteúdos: filtros, busca e tabela. */
export default async function ConteudosPage({ searchParams }: PageProps) {
  const [contents, clientes, perfis, meses] = await Promise.all([
    listContents(searchParams),
    listClientOptions(),
    listProfiles(),
    listReferenceMonths(),
  ]);

  return (
    <>
      <PageHeader
        titulo="Conteúdos"
        descricao="Pautas, roteiros e acompanhamento do pipeline de produção"
        acao={
          <Link href="/conteudos/novo">
            <Button>Novo conteúdo</Button>
          </Link>
        }
      />

      <ContentsToolbar clientes={clientes} meses={meses} />

      <ContentsTable
        contents={contents}
        clientes={clientes}
        perfis={perfis}
      />
    </>
  );
}
