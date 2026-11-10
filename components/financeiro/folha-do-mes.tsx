import Link from "next/link";
import {
  montarFolha,
  totalDaFolha,
  type GrupoFolha,
  type LancamentoFolha,
} from "@/lib/financeiro/folha";
import { BaixaRapida } from "@/components/financeiro/baixa-rapida";
import { Situacao } from "@/components/financeiro/situacao";
import { situacaoDoLancamento, textoDoPrazo } from "@/lib/financeiro/vencimento";
import {
  clienteSeFizerFalta,
  semRepetirOGrupo,
} from "@/lib/financeiro/nomes";
import { formatarData, formatarMoeda } from "@/lib/utils";
import type { FinancialKind } from "@/types";

/**
 * O prazo, em três caracteres e meio: "20/dez".
 *
 * A conta de um mês vence no mês seguinte, então a data quase nunca
 * é do mês que a tela nomeou e "vence 20/12/2026" por extenso fazia
 * cada linha ocupar duas. O dia e o mês bastam para agir.
 */
const MES_CURTO = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function prazoCurto(due: string | null): string {
  if (!due) return "sem data";
  const dia = Number(due.slice(8, 10));
  const mes = MES_CURTO[Number(due.slice(5, 7)) - 1];
  return mes ? `${dia}/${mes}` : formatarData(due);
}

interface ColunaProps {
  titulo: string;
  mes: string;
  /** Data de hoje em "YYYY-MM-DD", calculada no servidor. */
  hoje: string;
  grupos: GrupoFolha[];
  vazio: string;
}

/** Um lado da folha: tudo que entrou, ou tudo que saiu. */
function Coluna({ titulo, mes, hoje, grupos, vazio }: ColunaProps) {
  const total = totalDaFolha(grupos);

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <header className="border-b border-gray-200 px-4 py-2.5">
        <h3 className="text-base font-bold text-gray-900">{titulo}</h3>
      </header>

      {grupos.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-500">{vazio}</p>
      ) : (
        <div className="divide-y divide-gray-200">
          {grupos.map((g) => (
            <div key={g.categoria}>
              {/* Subtítulo de categoria só quando há mais de uma
                  categoria na coluna E mais de uma linha nela. Com uma
                  só, o subtítulo repetia o total da coluna duas vezes,
                  um embaixo do outro — e com uma linha só viraria
                  "DAS - Simples Nacional" com "DAS do Simples
                  Nacional" logo embaixo. */}
              {grupos.length > 1 && g.linhas.length > 1 ? (
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
                    className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-2"
                  >
                    <BaixaRapida
                      id={x.id}
                      pago={x.pago}
                      descricao={x.description}
                    />

                    <Link
                      href={`/interno/financeiro/lancamentos/${x.id}/editar`}
                      className="min-w-0 flex-1 text-sm text-gray-900 hover:underline"
                    >
                      {grupos.length > 1 && g.linhas.length > 1
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
                    </Link>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                      {formatarMoeda(x.amount)}
                    </span>
                    {/* Etiqueta é alarme, e alarme que toca em toda
                        linha ninguém escuta: antes havia uma em cada
                        uma das vinte, dezessete delas dizendo a mesma
                        coisa. Fica só no que venceu. Pago se vê na
                        caixinha marcada, e o prazo do resto é uma
                        data miúda. */}
                    <span className="min-w-[3.25rem] shrink-0 text-right">
                      {!x.pago && situacaoDoLancamento(x, hoje) === "Vencido" ? (
                        <Situacao estado="Vencido" texto={textoDoPrazo(x, hoje)} />
                      ) : x.pago ? null : (
                        <span className="text-xs tabular-nums text-gray-500">
                          {prazoCurto(x.due_date)}
                        </span>
                      )}
                    </span>

                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* O total no FIM da lista, como a linha "TOTAL RECEITAS" da
          planilha. Estava em cima, no cabeçalho, e aí aparecia duas
          vezes seguidas quando a coluna tinha uma categoria só. */}
      <footer className="flex items-baseline justify-between gap-3 border-t border-gray-200 bg-gray-50 px-4 py-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
          Total {titulo.toLowerCase()}
        </span>
        <span className="text-lg font-bold tabular-nums text-gray-900">
          {formatarMoeda(total)}
        </span>
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
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Coluna
        titulo="Entrou"
        mes={mes}
        hoje={hoje}
        grupos={lado("Receita")}
        vazio="Nenhuma receita lançada neste mês."
      />
      <Coluna
        titulo="Saiu"
        mes={mes}
        hoje={hoje}
        grupos={lado("Despesa")}
        vazio="Nenhuma despesa lançada neste mês."
      />
    </div>
  );
}
