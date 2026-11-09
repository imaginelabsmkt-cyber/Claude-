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
 * Fixos e ferramentas: tudo que se repete todo mês.
 *
 * Cadastrado aqui uma vez, vira lançamento de qualquer mês com um
 * clique em "Gerar do plano fixo".
 *
 * A tela é agrupada por categoria, com o total de cada grupo e a fatia
 * de cada item, porque foi o que a Fran pediu: "mais intuitiva e
 * visível como na planilha". A planilha dela tem "↳ Assinaturas e
 * ferramentas digitais" com cada ferramenta embaixo; a lista achatada
 * que existia aqui não respondia quanto custa o Canva.
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
        contexto="O que se repete todo mês, sem ninguém precisar lançar"
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
