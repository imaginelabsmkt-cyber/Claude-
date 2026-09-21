import { formatarData, formatarMoeda } from "@/lib/utils";
import type { FinancialEntryWithRelations } from "@/types";

/**
 * Lista os lançamentos de uma área no mês. Como a tela inteira já está
 * tingida pela área, aqui a cor não se repete linha a linha — só o
 * vermelho do que está em aberto aparece.
 */
export function RecorteLista({
  lancamentos,
  vazio,
}: {
  lancamentos: FinancialEntryWithRelations[];
  vazio: string;
}) {
  if (lancamentos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-500">
        {vazio}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
      {lancamentos.map((l) => (
        <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-gray-900">
              {l.description}
            </span>
            <span className="block text-xs text-gray-500">
              {l.client?.name ?? l.category?.name ?? "—"}
              {l.due_date ? ` · vence ${formatarData(l.due_date)}` : ""}
            </span>
          </span>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
            {formatarMoeda(Number(l.amount))}
          </span>
          <span
            className={
              "w-20 shrink-0 text-right text-xs font-semibold " +
              (l.status === "Pago" ? "text-gray-400" : "text-alerta")
            }
          >
            {l.status === "Pago" ? "pago" : "em aberto"}
          </span>
        </li>
      ))}
    </ul>
  );
}
