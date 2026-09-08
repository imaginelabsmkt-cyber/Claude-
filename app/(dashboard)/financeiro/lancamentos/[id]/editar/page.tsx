import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EntryForm } from "@/components/financeiro/entry-form";
import {
  listarCategorias,
  listarClientesFinanceiro,
  obterLancamento,
} from "@/lib/data/financeiro";
import { rotuloMes } from "@/lib/financeiro/meses";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

/** Edição de um lançamento existente. */
export default async function EditarLancamentoPage({ params }: PageProps) {
  const [lancamento, categorias, clientes] = await Promise.all([
    obterLancamento(params.id),
    listarCategorias(),
    listarClientesFinanceiro(),
  ]);

  if (!lancamento) notFound();

  return (
    <>
      <PageHeader
        titulo="Editar lançamento"
        descricao={`${lancamento.description} · ${rotuloMes(lancamento.reference_month)}`}
        icone="financeiro"
        tom="verde"
      />
      <Card>
        <CardContent>
          <EntryForm
            mes={lancamento.reference_month}
            categorias={categorias}
            clientes={clientes}
            lancamento={lancamento}
          />
        </CardContent>
      </Card>
    </>
  );
}
