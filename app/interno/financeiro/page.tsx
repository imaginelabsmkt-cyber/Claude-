import Link from "next/link";
import { AreaHeader } from "@/components/interno/area-header";
import { FinanceTabs } from "@/components/financeiro/finance-tabs";
import { FolhaDoMes } from "@/components/financeiro/folha-do-mes";
import { MonthActions } from "@/components/financeiro/month-actions";
import { MonthNav } from "@/components/financeiro/month-nav";
import { Secao } from "@/components/interno/secao";
import { contarRecorrenciasPendentes, obterPainelMes } from "@/lib/data/financeiro";
import { mesAtual, mesValido, rotuloMes } from "@/lib/financeiro/meses";
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
  const hoje = new Date().toISOString().slice(0, 10);

  const variacao =
    painel.variacaoReceita != null
      ? `${painel.variacaoReceita >= 0 ? "+" : ""}${formatarPercentual(painel.variacaoReceita)} contra o mês anterior`
      : null;

  const emAberto = resumo.aReceber + resumo.aPagar;

  return (
    <>
      <AreaHeader
        titulo="Financeiro"
        contexto="Quanto entrou e quanto saiu"
        acao={<MonthNav mes={mes} />}
      />

      <FinanceTabs />

      <div className="mb-6">
        <MonthActions mes={mes} recorrenciasPendentes={recorrenciasPendentes} />
      </div>

      <Secao
        titulo={`O mês de ${rotuloMes(mes)}`}
      >
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Saldo no dia 1
              </p>
              <p className="mt-0.5 text-xl font-bold tabular-nums text-gray-900">
                {formatarMoeda(resumo.saldoInicial)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                {resumo.resultado >= 0 ? "Sobrou" : "Faltou"}
              </p>
              <p
                className={
                  "mt-0.5 text-xl font-bold tabular-nums " +
                  (resumo.resultado < 0 ? "text-alerta" : "text-gray-900")
                }
              >
                {formatarMoeda(Math.abs(resumo.resultado))}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Saldo no fim
              </p>
              <p
                className={
                  "mt-0.5 text-2xl font-bold tabular-nums " +
                  (resumo.saldoFinal < 0 ? "text-alerta" : "text-gray-900")
                }
              >
                {formatarMoeda(resumo.saldoFinal)}
              </p>
            </div>
            {resumo.receitas > 0 ? (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Margem
                </p>
                <p className="mt-0.5 text-xl font-bold tabular-nums text-gray-900">
                  {formatarPercentual(resumo.margem)}
                </p>
              </div>
            ) : null}
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

      <Secao
        titulo="No que entrou e no que saiu"
      >
        <FolhaDoMes
          mes={mes}
          hoje={hoje}
          lancamentos={painel.lancamentos.map((l) => ({
            id: l.id,
            description: l.description,
            kind: l.kind,
            amount: Number(l.amount),
            status: l.status,
            due_date: l.due_date,
            categoria: l.category?.name ?? null,
            cliente: l.client?.name ?? null,
          }))}
        />
      </Secao>

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
