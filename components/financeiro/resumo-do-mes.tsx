import { formatarMoeda } from "@/lib/utils";
import type { ParteDaFolha } from "@/lib/financeiro/folha";

/**
 * O cabeçalho do mês, reescrito.
 *
 * A Fran, olhando o que estava lá: "ainda acho essa parte muito
 * confusa do financeiro". Fui olhar o que ela estava vendo:
 *
 *   1. A CONTA PULAVA O MEIO. Dizia "saldo inicial − resultado =
 *      saldo final" e não mostrava receitas e despesas, que são os
 *      números que FAZEM o resultado. O que ela lê na planilha é a
 *      cadeia inteira.
 *
 *   2. O SINAL DIZIA A MESMA COISA DUAS VEZES. "RESULTADO" com um
 *      "−" na frente e o número em vermelho: três avisos para um
 *      fato, e um resultado negativo escrito como positivo com um
 *      sinal do lado.
 *
 *   3. AS BARRAS NÃO TINHAM NÚMERO. Três cores, uma legenda
 *      ("baixado / em atraso / a vencer") e nenhum valor: dava para
 *      ver que tinha muito dourado, não quanto.
 *
 *   4. "PENDENTE DE BAIXA R$ 31.575,90" SOMAVA O QUE ENTRA COM O QUE
 *      SAI. Era o maior número da tela, maior que a receita do mês, e
 *      não queria dizer nada: a receber e a pagar não se somam.
 *
 * Aqui a cadeia está inteira, cada número tem rótulo, e as duas
 * situações viram uma tabelinha de duas linhas — sem legenda, porque
 * cada coluna diz o que é.
 */

interface ResumoDoMesProps {
  saldoInicial: number;
  resultado: number;
  saldoFinal: number;
  /** Frase pronta da variação contra o mês anterior, se houver. */
  variacao: string | null;
  entrou: ParteDaFolha;
  saiu: ParteDaFolha;
}

function Numero({
  rotulo,
  valor,
  sinal,
  alerta,
  destaque,
}: {
  rotulo: string;
  valor: number;
  sinal?: string;
  alerta?: boolean;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-end gap-3">
      {sinal ? (
        <span aria-hidden className="pb-1 text-lg font-bold text-gray-400">
          {sinal}
        </span>
      ) : null}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
          {rotulo}
        </p>
        <p
          className={
            "tabular-nums font-bold " +
            (destaque ? "text-xl sm:text-2xl " : "text-lg ") +
            (alerta ? "text-alerta" : "text-gray-900")
          }
        >
          {formatarMoeda(valor)}
        </p>
      </div>
    </div>
  );
}

/** Uma célula de dinheiro da tabelinha. Zero vira traço. */
function Celula({ valor, alerta }: { valor: number; alerta?: boolean }) {
  return (
    <td
      className={
        "whitespace-nowrap px-2 py-2 text-right tabular-nums sm:px-3 " +
        (valor === 0
          ? "text-gray-400"
          : alerta
            ? "font-semibold text-alerta"
            : "text-gray-700")
      }
    >
      {valor === 0 ? "—" : formatarMoeda(valor)}
    </td>
  );
}

/** A mesma informação da tabela, em uma linha, para telas estreitas. */
function Resumido({ rotulo, parte }: { rotulo: string; parte: ParteDaFolha }) {
  const partes: string[] = [];
  if (parte.pago > 0) partes.push(`baixado ${formatarMoeda(parte.pago)}`);
  if (parte.aVencer > 0) partes.push(`a vencer ${formatarMoeda(parte.aVencer)}`);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold text-gray-900">{rotulo}</span>
        <span className="tabular-nums font-bold text-gray-900">
          {formatarMoeda(parte.total)}
        </span>
      </div>
      <p className="text-xs text-gray-500">
        {parte.vencido > 0 ? (
          <strong className="font-semibold text-alerta">
            em atraso {formatarMoeda(parte.vencido)}
          </strong>
        ) : null}
        {parte.vencido > 0 && partes.length > 0 ? " · " : null}
        {partes.join(" · ")}
      </p>
    </div>
  );
}

export function ResumoDoMes({
  saldoInicial,
  resultado,
  saldoFinal,
  variacao,
  entrou,
  saiu,
}: ResumoDoMesProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
      {/* A cadeia inteira, como na planilha: o saldo do dia 1, mais o
          que entrou, menos o que saiu, dá o saldo do fim. */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:flex sm:flex-wrap sm:items-end">
        <Numero rotulo="Saldo inicial" valor={saldoInicial} />
        <Numero rotulo="Receitas" valor={entrou.total} sinal="+" />
        <Numero rotulo="Despesas" valor={saiu.total} sinal="−" />
        <Numero
          rotulo="Saldo final"
          valor={saldoFinal}
          sinal="="
          alerta={saldoFinal < 0}
          destaque
        />
      </div>

      {/* O resultado do mês sai da cadeia e vira uma linha só dele:
          é a resposta de "o mês fechou no azul?", e misturado na
          cadeia ele competia com o saldo. */}
      <p className="mt-2 text-sm text-gray-600">
        Resultado do mês{" "}
        <strong
          className={
            "font-semibold tabular-nums " +
            (resultado < 0 ? "text-alerta" : "text-gray-900")
          }
        >
          {resultado < 0 ? "−" : ""}
          {formatarMoeda(Math.abs(resultado))}
        </strong>
        {variacao ? <> · receita {variacao}</> : null}
      </p>

      {/* As duas situações, com número. Substitui as duas barras de
          três cores e a legenda: cada coluna diz o que é, e a pessoa
          lê o valor em vez de medir o tamanho da faixa. */}
      {/* No celular a tabela de cinco colunas de dinheiro não cabe —
          vira duas linhas corridas, que dizem o mesmo. */}
      <div className="mt-4 space-y-2 border-t border-gray-100 pt-3 sm:hidden">
        <Resumido rotulo="Receitas" parte={entrou} />
        <Resumido rotulo="Despesas" parte={saiu} />
      </div>

      <div className="mt-4 hidden border-t border-gray-100 pt-3 sm:block">
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-gray-500">
            <tr>
              <th scope="col" className="px-2 py-1 text-left font-bold sm:px-3" />
              <th scope="col" className="px-2 py-1 text-right font-bold sm:px-3">
                Baixado
              </th>
              <th scope="col" className="px-2 py-1 text-right font-bold sm:px-3">
                Em atraso
              </th>
              <th scope="col" className="px-2 py-1 text-right font-bold sm:px-3">
                A vencer
              </th>
              <th scope="col" className="px-2 py-1 text-right font-bold sm:px-3">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <th
                scope="row"
                className="px-2 py-2 text-left font-semibold text-gray-900 sm:px-3"
              >
                Receitas
              </th>
              <Celula valor={entrou.pago} />
              <Celula valor={entrou.vencido} alerta />
              <Celula valor={entrou.aVencer} />
              <td className="whitespace-nowrap px-2 py-2 text-right font-bold tabular-nums text-gray-900 sm:px-3">
                {formatarMoeda(entrou.total)}
              </td>
            </tr>
            <tr>
              <th
                scope="row"
                className="px-2 py-2 text-left font-semibold text-gray-900 sm:px-3"
              >
                Despesas
              </th>
              <Celula valor={saiu.pago} />
              <Celula valor={saiu.vencido} alerta />
              <Celula valor={saiu.aVencer} />
              <td className="whitespace-nowrap px-2 py-2 text-right font-bold tabular-nums text-gray-900 sm:px-3">
                {formatarMoeda(saiu.total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
