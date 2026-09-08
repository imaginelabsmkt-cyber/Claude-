import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EntryForm } from "@/components/financeiro/entry-form";
import { listarCategorias, listarClientesFinanceiro } from "@/lib/data/financeiro";
import { mesAtual, mesValido, rotuloMes } from "@/lib/financeiro/meses";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { mes?: string };
}

/** Criação de um lançamento avulso. */
export default async function NovoLancamentoPage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes) ? searchParams.mes : mesAtual();

  const [categorias, clientes] = await Promise.all([
    listarCategorias(),
    listarClientesFinanceiro(),
  ]);

  return (
    <>
      <PageHeader
        titulo="Novo lançamento"
        descricao={`Entrada ou saída em ${rotuloMes(mes)}`}
        icone="financeiro"
        tom="verde"
      />
      <Card>
        <CardContent>
          <EntryForm mes={mes} categorias={categorias} clientes={clientes} />
        </CardContent>
      </Card>
    </>
  );
}
