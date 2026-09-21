import { AreaHeader } from "@/components/interno/area-header";
import { FinanceTabs } from "@/components/financeiro/finance-tabs";
import { RecurrencesPanel } from "@/components/financeiro/recurrences-panel";
import {
  listarCategorias,
  listarClientesFinanceiro,
  listarRecorrencias,
} from "@/lib/data/financeiro";
import { mesAtual, mesValido } from "@/lib/financeiro/meses";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { mes?: string };
}

/**
 * Recorrências: as mensalidades dos clientes e os custos fixos da agência.
 * Cadastrados aqui uma vez, viram lançamentos de qualquer mês com um clique.
 */
export default async function RecorrenciasPage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes) ? searchParams.mes : mesAtual();

  const [recorrencias, categorias, clientes] = await Promise.all([
    listarRecorrencias(),
    listarCategorias(),
    listarClientesFinanceiro(),
  ]);

  return (
    <>
      <AreaHeader titulo="Recorrências" contexto="Plano fixo do mês" />

      <FinanceTabs />

      <RecurrencesPanel
        mes={mes}
        recorrencias={recorrencias}
        categorias={categorias}
        clientes={clientes}
      />
    </>
  );
}
