import { AreaHeader } from "@/components/interno/area-header";
import { FinanceTabs } from "@/components/financeiro/finance-tabs";
import { MonthActions } from "@/components/financeiro/month-actions";
import { MonthNav } from "@/components/financeiro/month-nav";
import { RecurrencesPanel } from "@/components/financeiro/recurrences-panel";
import {
  contarRecorrenciasPendentes,
  listarCategorias,
  listarClientesFinanceiro,
  listarLancamentos,
  listarRecorrencias,
} from "@/lib/data/financeiro";
import { mesAtual, mesValido, hojeISO } from "@/lib/financeiro/meses";

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
  const hoje = hojeISO();

  const [recorrencias, categorias, clientes, doMes, aGerar] = await Promise.all([
    listarRecorrencias(),
    listarCategorias(),
    listarClientesFinanceiro(),
    listarLancamentos({ mes }),
    contarRecorrenciasPendentes(mes),
  ]);

  // O lançamento do mês de cada recorrência, quando já foi gerado.
  const lancamentoDaRecorrencia = Object.fromEntries(
    doMes
      .filter((l) => l.recurrence_id)
      .map((l) => [
        l.recurrence_id as string,
        { id: l.id, status: l.status, due_date: l.due_date },
      ]),
  );

  return (
    <>
      <AreaHeader
        contexto="O que se repete todo mês"
        acao={<MonthNav mes={mes} />}
      />

      <FinanceTabs />

      <div className="mb-5">
        <MonthActions mes={mes} recorrenciasPendentes={aGerar} />
      </div>

      <RecurrencesPanel
        mes={mes}
        hoje={hoje}
        recorrencias={recorrencias}
        categorias={categorias}
        clientes={clientes}
        lancamentoDaRecorrencia={lancamentoDaRecorrencia}
      />
    </>
  );
}
