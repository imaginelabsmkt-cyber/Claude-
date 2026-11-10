import { notFound } from "next/navigation";
import { AreaHeader } from "@/components/interno/area-header";
import { Card, CardContent } from "@/components/ui/card";
import { EntryForm } from "@/components/financeiro/entry-form";
import { ExcluirLancamento } from "@/components/financeiro/excluir-lancamento";
import {
  listarCategorias,
  listarClientesFinanceiro,
  obterLancamento,
} from "@/lib/data/financeiro";
import { listarPessoasAtivas } from "@/lib/data/pessoas";
import { rotuloMes } from "@/lib/financeiro/meses";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

/** Edição de um lançamento existente. */
export default async function EditarLancamentoPage({ params }: PageProps) {
  const [lancamento, categorias, clientes, pessoas] = await Promise.all([
    obterLancamento(params.id),
    listarCategorias(),
    listarClientesFinanceiro(),
    listarPessoasAtivas(),
  ]);

  if (!lancamento) notFound();

  return (
    <>
      <AreaHeader
        titulo="Editar lançamento"
        contexto={rotuloMes(lancamento.reference_month)}
      />
      <Card>
        <CardContent>
          <EntryForm
            mes={lancamento.reference_month}
            categorias={categorias}
            clientes={clientes}
            pessoas={pessoas}
            lancamento={lancamento}
          />

          {/* "Quero excluir, como faz?" Faz aqui: um clique em
              "Editar" na linha da folha e o botão está no pé desta
              tela, longe do Salvar. */}
          <ExcluirLancamento
            id={lancamento.id}
            descricao={lancamento.description}
            valor={Number(lancamento.amount)}
            voltarPara={`/interno/financeiro?mes=${lancamento.reference_month}`}
          />
        </CardContent>
      </Card>
    </>
  );
}
