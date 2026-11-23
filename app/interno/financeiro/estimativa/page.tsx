import { AreaHeader } from "@/components/interno/area-header";
import { FinanceTabs } from "@/components/financeiro/finance-tabs";
import { PainelDaEstimativa } from "@/components/financeiro/painel-da-estimativa";
import { obterCarteira } from "@/lib/data/comercial";
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
 * Os clientes vêm da carteira de verdade, com a mensalidade que está
 * no sistema — não é para digitar nada que já existe. O que ela
 * inventa fica no navegador dela, porque isto é rascunho: responde
 * "e se", não registra o que aconteceu.
 */
export default async function EstimativaPage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes)
      ? searchParams.mes
      : mesAtual();

  const carteira = await obterCarteira(mes);

  return (
    <>
      <AreaHeader titulo="Estimativa" />

      <FinanceTabs />

      {carteira.ativos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-500">
          Nenhum cliente ativo ainda. Quando houver, eles aparecem aqui com a
          mensalidade de cada um.
        </p>
      ) : (
        <PainelDaEstimativa
          carteira={carteira.ativos.map((c) => ({
            id: c.id,
            nome: c.nome,
            mensal: c.mensal,
          }))}
          custoFixo={carteira.custoFixo}
          ticketMedio={carteira.ticketMedio}
        />
      )}
    </>
  );
}
