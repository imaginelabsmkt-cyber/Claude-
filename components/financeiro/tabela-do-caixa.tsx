import { rotuloMesCurto } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";

/** Uma linha da movimentação mensal. */
export interface MesDoCaixa {
  mes: string;
  saldoInicial: number;
  receitas: number;
  despesas: number;
  resultado: number;
  saldoFinal: number;
  /** Quanto do mês ainda não teve baixa (a receber + a pagar). */
  emAberto: number;
}

/**
 * A movimentação mês a mês do caixa.
 *
 * Vive num componente porque a prévia visual tinha uma CÓPIA deste
 * markup, e cópia envelhece: a prévia me mostrou a tabela com os
 * nomes antigos das colunas enquanto a página já estava com os novos.
 * É a mesma regra do cartão do mês — a prévia desenha o componente de
 * verdade, não uma imitação dele.
 */
export function TabelaDoCaixa({
  meses,
  emFoco,
}: {
  meses: MesDoCaixa[];
  /** O mês destacado na tabela. */
  emFoco?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm md:min-w-[640px]">
        <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
          <tr>
            <th scope="col" className="px-2 py-2.5 text-left font-bold sm:px-4">
              Mês
            </th>
            {/* QUANTAS COLUNAS CABEM, por largura de tela:
                  celular ... Mês, Resultado, Saldo final
                  tablet .... + Receitas e Despesas
                  desktop ... + Saldo inicial

                Com as seis em 390px a tabela passava de 640px e a
                coluna do saldo final — que é o ponto desta tela —
                ficava cortada pela metade. Receitas e despesas do mês
                estão inteiras na tela do Mês; o saldo inicial é o
                saldo final da linha de cima. */}
            <th
              scope="col"
              className="hidden px-4 py-2.5 text-right font-bold md:table-cell"
            >
              Saldo inicial
            </th>
            <th
              scope="col"
              className="hidden px-2 py-2.5 text-right font-bold sm:table-cell sm:px-4"
            >
              Receitas
            </th>
            <th
              scope="col"
              className="hidden px-2 py-2.5 text-right font-bold sm:table-cell sm:px-4"
            >
              Despesas
            </th>
            <th scope="col" className="px-2 py-2.5 text-right font-bold sm:px-4">
              Resultado
            </th>
            <th scope="col" className="px-2 py-2.5 text-right font-bold sm:px-4">
              Saldo final
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {meses.map((m) => {
            const vazio = m.receitas === 0 && m.despesas === 0;
            return (
              <tr
                key={m.mes}
                className={
                  (m.mes === emFoco ? "bg-gray-50 " : "") +
                  (vazio ? "text-gray-400" : "")
                }
              >
                <th
                  scope="row"
                  className={
                    "px-2 py-2.5 text-left font-medium sm:px-4 " +
                    (m.mes === emFoco ? "text-gray-900" : "text-gray-700")
                  }
                >
                  {rotuloMesCurto(m.mes)}
                  {m.emAberto > 0 ? (
                    <span className="block text-xs font-normal text-alerta sm:ml-2 sm:inline">
                      {formatarMoeda(m.emAberto)} em aberto
                    </span>
                  ) : null}
                </th>
                <td className="hidden whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-gray-500 md:table-cell">
                  {formatarMoeda(m.saldoInicial)}
                </td>
                <td className="hidden whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-gray-700 sm:table-cell sm:px-4">
                  {vazio ? "" : formatarMoeda(m.receitas)}
                </td>
                <td className="hidden whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-gray-700 sm:table-cell sm:px-4">
                  {vazio ? "" : formatarMoeda(m.despesas)}
                </td>
                <td
                  className={
                    "whitespace-nowrap px-2 py-2.5 text-right font-semibold tabular-nums sm:px-4 " +
                    (vazio
                      ? ""
                      : m.resultado < 0
                        ? "text-alerta"
                        : "text-gray-900")
                  }
                >
                  {vazio ? "" : formatarMoeda(m.resultado)}
                </td>
                <td
                  className={
                    "whitespace-nowrap px-2 py-2.5 text-right font-bold tabular-nums sm:px-4 " +
                    (m.saldoFinal < 0 ? "text-alerta" : "text-gray-900")
                  }
                >
                  {formatarMoeda(m.saldoFinal)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
