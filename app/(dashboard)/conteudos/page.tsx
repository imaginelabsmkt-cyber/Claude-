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
import { estaAtrasado, hojeISO, mesEfetivo } from "@/lib/rules/contents";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: FiltrosConteudo & { atrasado?: string };
}

/** Página geral de conteúdos: filtros, busca e tabela. */
export default async function ConteudosPage({ searchParams }: PageProps) {
  // Por padrão, abre no MÊS ATUAL (evita despejar todo o histórico). O usuário
  // troca de mês na barra, ou escolhe "todos" (reference_month=todos).
  const mesAtual = hojeISO(new Date()).slice(0, 7);
  const mesSel = searchParams.reference_month ?? mesAtual;
  // O mês NÃO é filtrado no banco: usamos o "mês efetivo" (que depende do
  // status — pendente cai no mês atual; publicado, no mês real; cancelado,
  // congelado). Os demais filtros continuam no banco.
  const filtros: FiltrosConteudo = { ...searchParams, reference_month: undefined };

  const [contentsRaw, clientes, perfis, meses] = await Promise.all([
    listContents(filtros, { excluirCapas: true }),
    listClientOptions(),
    listProfiles(),
    listReferenceMonths(),
  ]);

  const doMes =
    mesSel === "todos"
      ? contentsRaw
      : contentsRaw.filter((c) => mesEfetivo(c) === mesSel);

  // Filtro derivado "somente atrasados" (regra calculada, não no banco).
  const contents =
    searchParams.atrasado === "1" ? doMes.filter((c) => estaAtrasado(c)) : doMes;

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

      <ContentsToolbar
        clientes={clientes}
        meses={meses}
        mesSelecionado={mesSel}
        mesAtual={mesAtual}
      />

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
