import Link from "next/link";
import { AreaHeader } from "@/components/interno/area-header";
import { FinanceTabs } from "@/components/financeiro/finance-tabs";
import { FolhaDoMes } from "@/components/financeiro/folha-do-mes";
import { GraficoDoMes } from "@/components/financeiro/grafico-do-mes";
import { MonthActions } from "@/components/financeiro/month-actions";
import { MonthNav } from "@/components/financeiro/month-nav";
import { Conta } from "@/components/interno/conta";
import { Secao } from "@/components/interno/secao";
import { montarFolha, partirPorSituacao } from "@/lib/financeiro/folha";
import { situacaoDoLancamento } from "@/lib/financeiro/vencimento";
import { contarRecorrenciasPendentes, obterPainelMes } from "@/lib/data/financeiro";
import { mesAtual, mesValido, rotuloMes, hojeISO } from "@/lib/financeiro/meses";
import { formatarMoeda, formatarPercentual } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Financeiro" };

interface PageProps {
  searchParams: { mes?: string };
}

/**
 * Painel do mês, no formato da aba mensal da planilha da Fran.
 *
 * A planilha é a referência de propósito: saldo inicial em cima, o que
 * entrou de um lado, o que saiu do outro, cada um agrupado por
 * categoria com o total, e o fechamento embaixo (resultado, saldo
 * final, margem). É o formato que ela já lê sem aprender nada.
 *
 * A tela antes mostrava quatro números e só as PENDÊNCIAS. O mês
 * inteiro ficava invisível: "no que foi que o dinheiro saiu este mês"
 * não tinha resposta aqui, só duas telas adiante.
 */
export default async function FinanceiroPage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes) ? searchParams.mes : mesAtual();

  const [painel, recorrenciasPendentes] = await Promise.all([
    obterPainelMes(mes),
    contarRecorrenciasPendentes(mes),
  ]);
  const { resumo } = painel;
  const hoje = hojeISO();

  const variacao =
    painel.variacaoReceita != null
      ? `${painel.variacaoReceita >= 0 ? "+" : ""}${formatarPercentual(painel.variacaoReceita)} contra o mês anterior`
      : null;

  const emAberto = resumo.aReceber + resumo.aPagar;

  const lancamentos = painel.lancamentos.map((l) => ({
    id: l.id,
    description: l.description,
    kind: l.kind,
    amount: Number(l.amount),
    status: l.status,
    due_date: l.due_date,
    categoria: l.category?.name ?? null,
    cliente: l.client?.name ?? null,
  }));

  const venceu = (l: { due_date: string | null; status: string }) =>
    situacaoDoLancamento(l, hoje) === "Vencido";
  const partes = {
    entrou: partirPorSituacao(montarFolha(lancamentos, "Receita"), venceu),
    saiu: partirPorSituacao(montarFolha(lancamentos, "Despesa"), venceu),
  };

  return (
    <>
      <AreaHeader titulo="Financeiro" acao={<MonthNav mes={mes} />} />

      <FinanceTabs />

      <div className="mb-6">
        <MonthActions mes={mes} recorrenciasPendentes={recorrenciasPendentes} />
      </div>

      <Secao
        titulo={`O mês de ${rotuloMes(mes)}`}
      >
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          {/* A conta do mês, com o sinal à vista: o saldo do dia 1,
              mais (ou menos) o que o mês fez, dá o saldo do fim. É a
              mesma conta da planilha e a mesma do dashboard. */}
          <Conta
            parcelas={[
              { rotulo: "Saldo no dia 1", valor: resumo.saldoInicial },
              {
                rotulo: resumo.resultado >= 0 ? "Sobrou" : "Faltou",
                valor: Math.abs(resumo.resultado),
                sinal: resumo.resultado >= 0 ? "+" : "−",
                alerta: resumo.resultado < 0,
              },
              {
                rotulo: "Saldo no fim",
                valor: resumo.saldoFinal,
                sinal: "=",
                alerta: resumo.saldoFinal < 0,
              },
            ]}
          />

          <div className="mt-4 border-t border-gray-100 pt-4">
            <GraficoDoMes entrou={partes.entrou} saiu={partes.saiu} />
          </div>

          {emAberto > 0 || variacao ? (
            <p className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-600">
              {emAberto > 0 ? (
                <>
                  Ainda falta movimentar{" "}
                  <strong className="font-semibold text-gray-900">
                    {formatarMoeda(emAberto)}
                  </strong>
                  . Se tudo se confirmar, fecha em{" "}
                  <strong className="font-semibold text-gray-900">
                    {formatarMoeda(resumo.saldoFinalPrevisto)}
                  </strong>
                  .{" "}
                </>
              ) : null}
              {variacao ? <>A receita está {variacao}.</> : null}
            </p>
          ) : null}
        </div>
      </Secao>

      <div className="mb-6">
        <FolhaDoMes mes={mes} hoje={hoje} lancamentos={lancamentos} />
      </div>

      <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500">
        <Link
          href={`/interno/financeiro/lancamentos?mes=${mes}`}
          className="font-medium text-brand-700 hover:underline"
        >
          Procurar um lançamento
        </Link>
        <Link
          href={`/interno/relatorio?mes=${mes}`}
          className="font-medium text-brand-700 hover:underline"
        >
          Imprimir o fechamento
        </Link>
        <Link
          href={`/interno/financeiro/impostos?mes=${mes}`}
          className="font-medium text-brand-700 hover:underline"
        >
          Impostos e contabilidade
        </Link>
      </p>
    </>
  );
}
