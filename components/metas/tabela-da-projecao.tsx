import { formatarMoeda } from "@/lib/utils";
import { rotuloMesCurto } from "@/lib/financeiro/meses";
import type { MesDaProjecao } from "@/lib/metas/projecao";

/**
 * A projeção mês a mês.
 *
 * É a aba "Meta 50 mil" da planilha da Vitória, com uma coluna por
 * pessoa contratada. As colunas entram por largura: no celular ficam
 * as três que respondem a pergunta, mês, sobra e acumulado, e as
 * outras aparecem conforme a tela dá.
 */

export function TabelaDaProjecao({
  meses,
  pessoas,
  meta,
}: {
  meses: MesDaProjecao[];
  pessoas: { id: string; cargo: string }[];
  meta: number;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-bold">
              Mês
            </th>
            <th scope="col" className="hidden px-3 py-2 text-right font-bold sm:table-cell">
              Novos
            </th>
            <th scope="col" className="hidden px-3 py-2 text-right font-bold md:table-cell">
              Clientes
            </th>
            <th scope="col" className="hidden px-3 py-2 text-right font-bold sm:table-cell">
              Faturamento
            </th>
            <th scope="col" className="hidden px-3 py-2 text-right font-bold lg:table-cell">
              Contas fixas
            </th>
            {pessoas.map((p) => (
              <th
                key={p.id}
                scope="col"
                className="hidden whitespace-nowrap px-3 py-2 text-right font-bold xl:table-cell"
              >
                {p.cargo}
              </th>
            ))}
            <th scope="col" className="hidden px-3 py-2 text-right font-bold lg:table-cell">
              Custo
            </th>
            <th scope="col" className="px-3 py-2 text-right font-bold">
              Sobra
            </th>
            <th scope="col" className="px-3 py-2 text-right font-bold">
              Guardado
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {meses.map((m, i) => {
            /* O mês em que o acumulado cruza a meta ganha destaque: é
               a resposta da tela, e ela ficaria escondida no meio de
               seis linhas de número. */
            const bateu = m.guardadoAcumulado >= meta;
            const bateuAqui =
              bateu && (meses[i - 1]?.guardadoAcumulado ?? 0) < meta;
            return (
              <tr
                key={m.mes}
                className={bateuAqui ? "bg-green-50" : "hover:bg-gray-50"}
              >
                <th
                  scope="row"
                  className="whitespace-nowrap px-3 py-2 text-left font-semibold text-gray-900"
                >
                  {rotuloMesCurto(m.mes)}
                </th>
                <td className="hidden px-3 py-2 text-right tabular-nums text-gray-600 sm:table-cell">
                  {m.novosClientes || "-"}
                </td>
                <td className="hidden px-3 py-2 text-right tabular-nums text-gray-600 md:table-cell">
                  {m.clientesNoTotal}
                </td>
                <td className="hidden whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-700 sm:table-cell">
                  {formatarMoeda(m.faturamento)}
                </td>
                <td className="hidden whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-600 lg:table-cell">
                  {formatarMoeda(m.custoFixo + m.impostoEContador + m.saidaDoMei)}
                </td>
                {pessoas.map((p) => (
                  <td
                    key={p.id}
                    className="hidden whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-600 xl:table-cell"
                  >
                    {m.custoDasPessoas[p.id]
                      ? formatarMoeda(m.custoDasPessoas[p.id])
                      : "-"}
                  </td>
                ))}
                <td className="hidden whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-700 lg:table-cell">
                  {formatarMoeda(m.custoTotal)}
                </td>
                <td
                  className={
                    "whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums " +
                    (m.sobra < 0 ? "text-alerta" : "text-gray-900")
                  }
                >
                  {m.sobra < 0 ? "−" : ""}
                  {formatarMoeda(Math.abs(m.sobra))}
                </td>
                <td
                  className={
                    "whitespace-nowrap px-3 py-2 text-right font-bold tabular-nums " +
                    (bateu ? "text-green-700" : "text-gray-900")
                  }
                >
                  {formatarMoeda(m.guardadoAcumulado)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
