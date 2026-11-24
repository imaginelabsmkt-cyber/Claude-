import { AreaHeader } from "@/components/interno/area-header";
import { FinanceTabs } from "@/components/financeiro/finance-tabs";
import { PainelDaEstimativa } from "@/components/financeiro/painel-da-estimativa";
import { listarLeads, obterCarteira } from "@/lib/data/comercial";
import { ETAPAS_ABERTAS } from "@/lib/comercial/etapas";
import { mesAtual, mesValido } from "@/lib/financeiro/meses";

export const dynamic = "force-dynamic";

export const metadata = { title: "Estimativa" };

interface PageProps {
  searchParams: { mes?: string };
}

/**
 * Estimativa: quanto fica o faturamento se a carteira mudar.
 *
 * A Fran pediu com estas palavras: "uma estimativa do que, se a gente
 * pegar mais tantos clientes, quanto que fica o nosso faturamento
 * mensal (...) vai ter todos os nossos clientes, mais os clientes que
 * a gente vai adicionar".
 *
 * E depois: "QUERO QUE SEJA DE ACORDO COM O QUE ESTAMOS
 * PROSPECTANDO NO COMERCIAL."
 *
 * Então são duas listas de verdade: a CARTEIRA, com a mensalidade que
 * está no sistema, e o FUNIL, com as oportunidades abertas. Não é
 * para digitar nada que já existe em outro lugar.
 *
 * O que ela marcar fica no navegador dela, porque isto é rascunho:
 * responde "e se", não registra o que aconteceu.
 */
export default async function EstimativaPage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes)
      ? searchParams.mes
      : mesAtual();

  /* A Fran: "QUERO QUE SEJA DE ACORDO COM O QUE ESTAMOS PROSPECTANDO
     NO COMERCIAL." Então as oportunidades vêm do funil, as de
     verdade, com nome, etapa e valor estimado — não de um botão que
     inventa cliente do nada. */
  const [carteira, leads] = await Promise.all([
    obterCarteira(mes),
    listarLeads(ETAPAS_ABERTAS),
  ]);

  const prospeccao = leads
    .map((l) => ({
      id: l.id,
      nome: l.name,
      mensal: Number(l.estimated_monthly ?? 0),
      etapa: l.stage as string,
      temperatura: (l.temperature as string | null) ?? null,
    }))
    /* Oportunidade sem valor estimado não entra: ela não soma nada e
       só faria a lista parecer maior do que é. O lugar de pôr o
       valor é a ficha dela, no comercial. */
    .filter((o) => o.mensal > 0)
    .sort((a, b) => b.mensal - a.mensal);

  return (
    <>
      <AreaHeader titulo="Estimativa" />

      <FinanceTabs />

      {carteira.ativos.length === 0 && prospeccao.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-500">
          Nenhum cliente ativo e nada em prospecção. Quando houver, eles
          aparecem aqui com a mensalidade de cada um.
        </p>
      ) : (
        <PainelDaEstimativa
          carteira={carteira.ativos.map((c) => ({
            id: c.id,
            nome: c.nome,
            mensal: c.mensal,
          }))}
          prospeccao={prospeccao}
          custoFixo={carteira.custoFixo}
          ticketMedio={carteira.ticketMedio}
        />
      )}
    </>
  );
}
