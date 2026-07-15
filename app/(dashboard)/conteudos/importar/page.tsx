import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { ImportPlanning } from "@/components/contents/import-planning";
import { listClientOptions } from "@/lib/data/contents";

export const dynamic = "force-dynamic";

/** Importar planejamento (.docx) e criar os conteúdos automaticamente. */
export default async function ImportarPlanejamentoPage() {
  const clientes = await listClientOptions();

  return (
    <>
      <PageHeader
        titulo="Importar planejamento"
        descricao="Suba o documento da Vitória e o sistema cria os conteúdos separados."
      />
      <Link
        href="/conteudos"
        className="mb-4 inline-block text-sm text-brand-700 hover:underline"
      >
        ← Voltar para conteúdos
      </Link>

      {clientes.length === 0 ? (
        <EmptyState
          titulo="Cadastre um cliente primeiro"
          descricao="É preciso ter ao menos um cliente ativo para importar um planejamento."
          acao={
            <Link href="/clientes/novo">
              <Button>Novo cliente</Button>
            </Link>
          }
        />
      ) : (
        <ImportPlanning clientes={clientes} />
      )}
    </>
  );
}
