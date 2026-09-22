import { AreaHeader } from "@/components/interno/area-header";
import { Card, CardContent } from "@/components/ui/card";
import { EntryForm } from "@/components/financeiro/entry-form";
import { listarCategorias, listarClientesFinanceiro } from "@/lib/data/financeiro";
import { listarPessoasAtivas } from "@/lib/data/pessoas";
import { mesAtual, mesValido, rotuloMes } from "@/lib/financeiro/meses";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { mes?: string };
}

/** Criação de um lançamento avulso. */
export default async function NovoLancamentoPage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes) ? searchParams.mes : mesAtual();

  const [categorias, clientes, pessoas] = await Promise.all([
    listarCategorias(),
    listarClientesFinanceiro(),
    listarPessoasAtivas(),
  ]);

  return (
    <>
      <AreaHeader titulo="Novo lançamento" contexto={rotuloMes(mes)} />
      <Card>
        <CardContent>
          <EntryForm
            mes={mes}
            categorias={categorias}
            clientes={clientes}
            pessoas={pessoas}
          />
        </CardContent>
      </Card>
    </>
  );
}
