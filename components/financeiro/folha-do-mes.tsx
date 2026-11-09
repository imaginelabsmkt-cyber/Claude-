import Link from "next/link";
import {
  montarFolha,
  totalDaFolha,
  type GrupoFolha,
  type LancamentoFolha,
} from "@/lib/financeiro/folha";
import {
  clienteSeFizerFalta,
  semRepetirOGrupo,
} from "@/lib/financeiro/nomes";
import { formatarData, formatarMoeda } from "@/lib/utils";
import type { FinancialKind } from "@/types";

/**
 * Texto do prazo, curto de propósito.
 *
 * "vence 10/11/2026" quebrava em duas linhas e fazia cada lançamento
 * ocupar o dobro da altura. Dentro do mês que a tela já nomeou, o dia
 * basta; só uma data de outro mês aparece por extenso.
 */
function textoDoPrazo(due: string | null, mes: string): string {
  if (!due) return "em aberto";
  if (due.startsWith(mes)) return `vence dia ${Number(due.slice(8, 10))}`;
  return `vence ${formatarData(due)}`;
}

interface ColunaProps {
  titulo: string;
  mes: string;
  explicacao: string;
  grupos: GrupoFolha[];
  /** Quanto ainda está em aberto deste lado. */
  emAberto: number;
  rotuloAberto: string;
  verTudo: string;
  vazio: string;
}

/** Um lado da folha: tudo que entrou, ou tudo que saiu. */
function Coluna({
  titulo,
  mes,
  explicacao,
  grupos,
  emAberto,
  rotuloAberto,
  verTudo,
  vazio,
}: ColunaProps) {
  const total = totalDaFolha(grupos);

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <header className="border-b border-gray-200 px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h3 className="text-base font-bold text-gray-900">{titulo}</h3>
          <span className="text-xl font-bold tabular-nums text-gray-900">
            {formatarMoeda(total)}
          </span>
        </div>
        <p className="mt-0.5 text-[13px] text-gray-500">{explicacao}</p>
        {emAberto > 0 ? (
          <p className="mt-1 text-[13px] font-semibold text-alerta">
            {formatarMoeda(emAberto)} {rotuloAberto}
          </p>
        ) : null}
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
                    <span
                      className={
                        "w-24 shrink-0 text-right text-xs font-medium " +
                        (x.pago ? "text-gray-400" : "text-alerta")
                      }
                    >
                      {x.pago ? "pago" : textoDoPrazo(x.due_date, mes)}
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
  aReceber: number;
  aPagar: number;
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
export function FolhaDoMes({
  lancamentos,
  mes,
  aReceber,
  aPagar,
}: FolhaDoMesProps) {
  const lado = (kind: FinancialKind) => montarFolha(lancamentos, kind);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Coluna
        titulo="Entrou"
        mes={mes}
        explicacao="Tudo que o mês tem a receber, pago ou não."
        grupos={lado("Receita")}
        emAberto={aReceber}
        rotuloAberto="ainda a receber"
        vazio="Nenhuma receita lançada neste mês."
        verTudo={`/interno/financeiro/lancamentos?mes=${mes}&tipo=Receita`}
      />
      <Coluna
        titulo="Saiu"
        mes={mes}
        explicacao="Tudo que o mês tem a pagar, pago ou não."
        grupos={lado("Despesa")}
        emAberto={aPagar}
        rotuloAberto="ainda a pagar"
        vazio="Nenhuma despesa lançada neste mês."
        verTudo={`/interno/financeiro/lancamentos?mes=${mes}&tipo=Despesa`}
      />
    </div>
  );
}
