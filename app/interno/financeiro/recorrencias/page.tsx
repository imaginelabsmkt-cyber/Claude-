import { AreaHeader } from "@/components/interno/area-header";
import { FinanceTabs } from "@/components/financeiro/finance-tabs";
import { MonthNav } from "@/components/financeiro/month-nav";
import { RecurrencesPanel } from "@/components/financeiro/recurrences-panel";
import {
  contarRecorrenciasPendentes,
  listarCategorias,
  listarClientesFinanceiro,
  listarRecorrencias,
} from "@/lib/data/financeiro";
import { mesAtual, mesValido } from "@/lib/financeiro/meses";

export const dynamic = "force-dynamic";

export const metadata = { title: "Fixos e ferramentas" };

interface PageProps {
  searchParams: { mes?: string };
}

/**
 * Fixos e ferramentas: o plano que se repete, e como ele está ESTE mês.
 *
 * A tela listava o plano e mais nada: dava para ver que o Canva custa
 * R$ 53, não dava para ver se o Canva deste mês já foi pago. A Fran
 * pediu exatamente isso, porque é o que a planilha dela tem: cada
 * ferramenta com o próprio status.
 *
 * Então cada linha do plano carrega o lançamento do mês escolhido, se
 * já existir, com a situação dele e a baixa ali mesmo.
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
      <AreaHeader
        titulo="Fixos e ferramentas"
        acao={<MonthNav mes={mes} />}
      />

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
