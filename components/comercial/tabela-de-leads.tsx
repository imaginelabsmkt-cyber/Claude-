import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { rotuloDaSituacao, situacaoDe, type DaBase } from "@/lib/comercial/base";
import { LEAD_TEMPERATURE_TONE } from "@/types";
import { formatarMoeda } from "@/lib/utils";

/**
 * A tabela de "Leads e clientes".
 *
 * Componente de verdade, e não markup dentro da página, porque a
 * prévia visual desenha ESTE arquivo: cópia de markup envelhece.
 */

/** Data curta no fuso da agência, sem passar pelo relógio do navegador. */
function dataCurta(d: string | null): string {
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return "";
  const [, m, dia] = d.split("-");
  return `${dia}/${m}`;
}

export function TabelaDeLeads({ linhas }: { linhas: DaBase[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
          <tr>
            <th scope="col" className="px-4 py-2 text-left font-bold">
              Nome
            </th>
            <th scope="col" className="px-3 py-2 text-left font-bold">
              Origem
            </th>
            <th scope="col" className="px-3 py-2 text-left font-bold">
              Temperatura
            </th>
            <th scope="col" className="px-3 py-2 text-left font-bold">
              Situação
            </th>
            <th scope="col" className="px-3 py-2 text-left font-bold">
              Próximo contato
            </th>
            <th scope="col" className="px-4 py-2 text-right font-bold">
              Valor mensal
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {linhas.map((l) => {
            const emJogo = situacaoDe(l) === "Em negociação";
            return (
              <tr key={l.id} className="hover:bg-gray-50">
                <th scope="row" className="px-4 py-2.5 text-left">
                  <Link
                    href={`/interno/comercial/${l.id}`}
                    className="font-semibold text-gray-900 hover:underline"
                  >
                    {l.name}
                  </Link>
                </th>
                <td className="whitespace-nowrap px-3 py-2.5 text-gray-600">
                  {l.channel ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  {l.temperature ? (
                    <Badge tom={LEAD_TEMPERATURE_TONE[l.temperature]}>
                      {l.temperature}
                    </Badge>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-gray-700">
                  {rotuloDaSituacao(l)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-gray-600">
                  {emJogo && l.next_contact_on
                    ? dataCurta(l.next_contact_on)
                    : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums text-gray-900">
                  {formatarMoeda(l.estimated_monthly)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
