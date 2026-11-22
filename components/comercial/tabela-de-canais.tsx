import { formatarMoeda } from "@/lib/utils";
import type { ResultadoDoCanal } from "@/lib/comercial/canais";
import { totaisDosCanais } from "@/lib/comercial/canais";

/** Por cento, ou um traço quando não há base para calcular. */
const pct = (v: number | null) =>
  v === null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

/** Dinheiro, ou um traço. */
const dinheiro = (v: number | null) => (v === null ? "—" : formatarMoeda(v));

/** "16,0x", ou um traço. */
const vezes = (v: number | null) =>
  v === null
    ? "—"
    : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}x`;

/**
 * O comparativo dos canais: o que trouxe contra o que custou.
 *
 * As colunas do protótipo da Vitória. O traço em vez de zero é
 * proposital: custo por cliente sem cliente fechado não é "R$ 0", é
 * uma conta que não dá para fazer, e um zero ali diria que o canal é
 * de graça — exatamente o contrário do que aconteceu.
 */
export function TabelaDeCanais({ linhas }: { linhas: ResultadoDoCanal[] }) {
  if (linhas.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
        Nenhum canal com oportunidade ou investimento.
      </p>
    );
  }

  const t = totaisDosCanais(linhas);

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm md:min-w-[720px]">
        <thead className="border-b border-gray-200 bg-gray-50 text-[11px] uppercase tracking-wider text-gray-600">
          <tr>
            <th scope="col" className="px-2 py-2.5 text-left font-bold sm:px-4">
              Canal
            </th>
            <th
              scope="col"
              className="hidden px-4 py-2.5 text-right font-bold sm:table-cell"
            >
              Leads
            </th>
            <th scope="col" className="px-2 py-2.5 text-right font-bold sm:px-4">
              Fechados
            </th>
            <th
              scope="col"
              className="hidden px-4 py-2.5 text-right font-bold md:table-cell"
            >
              Conversão
            </th>
            <th scope="col" className="px-2 py-2.5 text-right font-bold sm:px-4">
              Investido
            </th>
            <th scope="col" className="px-2 py-2.5 text-right font-bold sm:px-4">
              Custo/cliente
            </th>
            <th
              scope="col"
              className="hidden px-4 py-2.5 text-right font-bold md:table-cell"
            >
              Receita mensal
            </th>
            <th
              scope="col"
              className="hidden px-4 py-2.5 text-right font-bold md:table-cell"
            >
              Retorno 12m
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {linhas.map((l) => (
            <tr key={l.canal}>
              <th
                scope="row"
                className="px-2 py-2.5 text-left font-medium text-gray-900 sm:px-4"
              >
                {l.canal}
              </th>
              <td className="hidden whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-gray-600 sm:table-cell">
                {l.leads}
              </td>
              <td className="whitespace-nowrap px-2 py-2.5 text-right font-semibold tabular-nums text-gray-900 sm:px-4">
                {l.fechados}
              </td>
              <td className="hidden whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-gray-600 md:table-cell">
                {pct(l.conversao)}
              </td>
              <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-gray-700 sm:px-4">
                {l.investido > 0 ? formatarMoeda(l.investido) : "—"}
              </td>
              <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-gray-900 sm:px-4">
                {dinheiro(l.custoPorCliente)}
              </td>
              <td className="hidden whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-gray-700 md:table-cell">
                {l.receitaMensal > 0 ? formatarMoeda(l.receitaMensal) : "—"}
              </td>
              <td className="hidden whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums text-gray-900 md:table-cell">
                {vezes(l.retorno12Meses)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-gray-200 bg-gray-50 text-[13px] font-bold text-gray-900">
          <tr>
            <th scope="row" className="px-2 py-2.5 text-left sm:px-4">
              Total
            </th>
            <td className="hidden whitespace-nowrap px-4 py-2.5 text-right tabular-nums sm:table-cell">
              {t.leads}
            </td>
            <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums sm:px-4">
              {t.fechados}
            </td>
            <td className="hidden whitespace-nowrap px-4 py-2.5 text-right tabular-nums md:table-cell">
              {pct(t.conversao)}
            </td>
            <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums sm:px-4">
              {t.investido > 0 ? formatarMoeda(t.investido) : "—"}
            </td>
            <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums sm:px-4">
              {dinheiro(t.custoPorCliente)}
            </td>
            <td className="hidden whitespace-nowrap px-4 py-2.5 text-right tabular-nums md:table-cell">
              {t.receitaMensal > 0 ? formatarMoeda(t.receitaMensal) : "—"}
            </td>
            <td className="hidden whitespace-nowrap px-4 py-2.5 text-right tabular-nums md:table-cell">
              {vezes(t.retorno12Meses)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
