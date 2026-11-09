import Link from "next/link";
import {
  montarFolha,
  partirPorSituacao,
  totalDaFolha,
  type GrupoFolha,
  type LancamentoFolha,
} from "@/lib/financeiro/folha";
import { Situacao } from "@/components/financeiro/situacao";
import { situacaoDoLancamento, textoDoPrazo } from "@/lib/financeiro/vencimento";
import {
  clienteSeFizerFalta,
  semRepetirOGrupo,
} from "@/lib/financeiro/nomes";
import { formatarData, formatarMoeda } from "@/lib/utils";
import type { FinancialKind } from "@/types";

/**
 * A barra de situação do cabeçalho da coluna.
 *
 * Uma linha só, repartida em pago, a vencer e vencido, nas MESMAS cores
 * das etiquetas de cada lançamento. É o gráfico que a lista não dá: de
 * olho, quanto do mês já está resolvido.
 *
 * Nenhuma parte aparece sem valor, e o vão de 2px entre elas é o papel
 * do cartão aparecendo, não um contorno.
 */
function BarraDaSituacao({
  partes,
}: {
  partes: { pago: number; aVencer: number; vencido: number; total: number };
}) {
  if (partes.total <= 0) return null;
  const pedaco = (valor: number, cor: string, nome: string) =>
    valor > 0 ? (
      <div
        key={nome}
        className={`h-2 ${cor}`}
        style={{ width: `${(valor / partes.total) * 100}%` }}
        title={`${nome}: ${formatarMoeda(valor)}`}
      />
    ) : null;

  return (
    <div className="mt-2 flex gap-0.5 overflow-hidden rounded-full">
      {pedaco(partes.pago, "bg-green-700", "pago")}
      {pedaco(partes.aVencer, "bg-amber-600", "a vencer")}
      {pedaco(partes.vencido, "bg-red-700", "vencido")}
    </div>
  );
}

/**
 * Texto do prazo, curto de propósito.
 *
 * "vence 10/11/2026" quebrava em duas linhas e fazia cada lançamento
 * ocupar o dobro da altura. Dentro do mês que a tela já nomeou, o dia
 * basta; só uma data de outro mês aparece por extenso.
 */
function textoDoPrazoNoMes(due: string | null, mes: string): string {
  if (!due) return "em aberto";
  if (due.startsWith(mes)) return `vence dia ${Number(due.slice(8, 10))}`;
  return `vence ${formatarData(due)}`;
}

interface ColunaProps {
  titulo: string;
  mes: string;
  /** Data de hoje em "YYYY-MM-DD", calculada no servidor. */
  hoje: string;
  grupos: GrupoFolha[];
  verTudo: string;
  vazio: string;
}

/** Um lado da folha: tudo que entrou, ou tudo que saiu. */
function Coluna({ titulo, mes, hoje, grupos, verTudo, vazio }: ColunaProps) {
  const total = totalDaFolha(grupos);
  const partes = partirPorSituacao(
    grupos,
    (l) => situacaoDoLancamento(l, hoje) === "Vencido",
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <header className="border-b border-gray-200 px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h3 className="text-base font-bold text-gray-900">{titulo}</h3>
          <span className="text-xl font-bold tabular-nums text-gray-900">
            {formatarMoeda(total)}
          </span>
        </div>
        <BarraDaSituacao partes={partes} />

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
          {partes.pago > 0 ? (
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-2 rounded-full bg-green-700" />
              {formatarMoeda(partes.pago)} pago
            </span>
          ) : null}
          {partes.aVencer > 0 ? (
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-2 rounded-full bg-amber-600" />
              {formatarMoeda(partes.aVencer)} a vencer
            </span>
          ) : null}
          {partes.vencido > 0 ? (
            <span className="flex items-center gap-1.5 font-semibold text-alerta">
              <span aria-hidden className="h-2 w-2 rounded-full bg-red-700" />
              {formatarMoeda(partes.vencido)} vencido
            </span>
          ) : null}
        </div>
      </header>

      {grupos.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-500">{vazio}</p>
      ) : (
        <div className="divide-y divide-gray-200">
          {grupos.map((g) => (
            <div key={g.categoria}>
              {/* Categoria de uma linha só não ganha subtítulo: viraria
                  "DAS - Simples Nacional" com "DAS do Simples Nacional"
                  logo embaixo. Na planilha ela também é uma linha só. */}
              {g.linhas.length > 1 ? (
                <div className="flex items-baseline justify-between gap-3 bg-gray-50 px-4 py-1.5">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    {g.categoria}
                  </h4>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-gray-900">
                    {formatarMoeda(g.total)}
                  </span>
                </div>
              ) : null}
              <ul className="divide-y divide-gray-100">
                {g.linhas.map((x) => (
                  <li
                    key={x.id}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2"
                  >
                    <span className="min-w-0 flex-1 text-sm text-gray-900">
                      {g.linhas.length > 1
                        ? semRepetirOGrupo(x.description, g.categoria)
                        : x.description}
                      {clienteSeFizerFalta(
                        semRepetirOGrupo(x.description, g.categoria),
                        x.cliente,
                      ) ? (
                        <span className="text-gray-500">
                          {" "}
                          ·{" "}
                          {clienteSeFizerFalta(
                            semRepetirOGrupo(x.description, g.categoria),
                            x.cliente,
                          )}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                      {formatarMoeda(x.amount)}
                    </span>
                    <span className="shrink-0">
                      {/* Vencido fala em quanto tempo passou, que é o
                          que faz agir; o que ainda vai vencer fala em
                          dia, que é mais curto e não quebra a linha. */}
                      <Situacao
                        estado={situacaoDoLancamento(x, hoje)}
                        texto={
                          situacaoDoLancamento(x, hoje) === "Vencido"
                            ? textoDoPrazo(x, hoje)
                            : x.pago
                              ? "pago"
                              : textoDoPrazoNoMes(x.due_date, mes)
                        }
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <footer className="border-t border-gray-200 px-4 py-2">
        <Link
          href={verTudo}
          className="text-sm font-medium text-gray-600 hover:underline"
        >
          Abrir em Lançamentos
        </Link>
      </footer>
    </section>
  );
}

interface FolhaDoMesProps {
  lancamentos: LancamentoFolha[];
  mes: string;
  /** Data de hoje em "YYYY-MM-DD", calculada no servidor. */
  hoje: string;
}

/**
 * A folha do mês, no formato da aba mensal da planilha da Fran.
 *
 * Entrou de um lado, saiu do outro, cada um agrupado por categoria com
 * o total do grupo, e o status de cada linha. É o formato que ela já lê
 * sem aprender nada, e é o que a tela não mostrava: antes aqui só
 * apareciam as PENDÊNCIAS, então o mês inteiro ficava invisível e a
 * pergunta "no que foi que o dinheiro saiu este mês" não tinha resposta
 * nesta tela.
 */
export function FolhaDoMes({ lancamentos, mes, hoje }: FolhaDoMesProps) {
  const lado = (kind: FinancialKind) => montarFolha(lancamentos, kind);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Coluna
        titulo="Entrou"
        mes={mes}
        hoje={hoje}
        grupos={lado("Receita")}
        vazio="Nenhuma receita lançada neste mês."
        verTudo={`/interno/financeiro/lancamentos?mes=${mes}&tipo=Receita`}
      />
      <Coluna
        titulo="Saiu"
        mes={mes}
        hoje={hoje}
        grupos={lado("Despesa")}
        vazio="Nenhuma despesa lançada neste mês."
        verTudo={`/interno/financeiro/lancamentos?mes=${mes}&tipo=Despesa`}
      />
    </div>
  );
}
