"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  definirStatusLancamentoAction,
  excluirLancamentoAction,
} from "@/lib/actions/financeiro";
import { clienteSeFizerFalta } from "@/lib/financeiro/nomes";
import {
  situacaoDoLancamento,
  textoDoPrazo,
} from "@/lib/financeiro/vencimento";
import { toast } from "@/lib/ui/toast";
import { formatarMoeda } from "@/lib/utils";
import type { FinancialEntryWithRelations } from "@/types";

interface EntriesTableProps {
  lancamentos: FinancialEntryWithRelations[];
  /** Data de hoje em "YYYY-MM-DD", calculada no servidor. */
  hoje: string;
}

/**
 * A lista de trabalho do financeiro.
 *
 * Não é leitura: é a tela que a pessoa abre para dar baixa, corrigir e
 * lançar. Por isso a ordem é por urgência (vencido primeiro) e não por
 * categoria, que é o papel do Painel do mês.
 *
 * Duas coisas que estavam repetidas saíram:
 *
 *  - a coluna "Situação" dizia "Pendente" e o botão ao lado dizia
 *    "Marcar pago", que é a mesma informação de dois jeitos. Ficou só
 *    o prazo em palavras ("venceu há 4 dias"), que diz mais;
 *  - o botão de baixa era primário em toda linha, então vinte linhas
 *    eram vinte botões vinho gritando juntos. Agora é um botão
 *    discreto, e só em quem ainda não foi baixado.
 */
export function EntriesTable({ lancamentos, hoje }: EntriesTableProps) {
  const router = useRouter();
  const [excluindo, setExcluindo] = useState<FinancialEntryWithRelations | null>(null);
  const [processando, iniciar] = useTransition();

  function alternarStatus(l: FinancialEntryWithRelations) {
    iniciar(async () => {
      const novo = l.status === "Pago" ? "Pendente" : "Pago";
      const r = await definirStatusLancamentoAction(l.id, novo);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível atualizar.");
        return;
      }
      toast.sucesso(
        novo === "Pago" ? "Baixado." : "Lançamento reaberto.",
      );
      router.refresh();
    });
  }

  function confirmarExclusao() {
    if (!excluindo) return;
    const id = excluindo.id;
    iniciar(async () => {
      const r = await excluirLancamentoAction(id);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível excluir.");
        return;
      }
      setExcluindo(null);
      toast.sucesso("Lançamento excluído.");
      router.refresh();
    });
  }

  const corDoPrazo = (l: FinancialEntryWithRelations) => {
    const s = situacaoDoLancamento(l, hoje);
    if (s === "Vencido" || s === "Vence hoje") return "text-alerta font-semibold";
    if (s === "Pago") return "text-gray-400";
    return "text-gray-500";
  };

  const valor = (l: FinancialEntryWithRelations) =>
    `${l.kind === "Receita" ? "+" : "-"} ${formatarMoeda(Number(l.amount))}`;

  const acao =
    "rounded px-1.5 py-0.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50";

  function Acoes({ l }: { l: FinancialEntryWithRelations }) {
    return (
      <span className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={() => alternarStatus(l)}
          disabled={processando}
          className={
            l.status === "Pago"
              ? acao
              : "rounded border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          }
        >
          {l.status === "Pago" ? "Reabrir" : "Dar baixa"}
        </button>
        <Link
          href={`/interno/financeiro/lancamentos/${l.id}/editar`}
          className={acao}
        >
          Editar
        </Link>
        <button
          type="button"
          onClick={() => setExcluindo(l)}
          disabled={processando}
          className={acao + " hover:bg-alerta-soft hover:text-alerta"}
        >
          Excluir
        </button>
      </span>
    );
  }

  return (
    <>
      {/* Celular: uma linha por lançamento, sem tabela */}
      <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm sm:hidden">
        {lancamentos.map((l) => (
          <li key={l.id} className="px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 flex-1 text-sm font-medium text-gray-900">
                {l.description}
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                {valor(l)}
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="text-xs text-gray-500">
                {l.category?.name ?? "Sem categoria"}
                {clienteSeFizerFalta(l.description, l.client?.name ?? null)
                  ? ` · ${l.client?.name}`
                  : ""}
              </span>
              <span className={"text-xs " + corDoPrazo(l)}>
                {textoDoPrazo(l, hoje)}
              </span>
            </div>
            <div className="mt-2">
              <Acoes l={l} />
            </div>
          </li>
        ))}
      </ul>

      {/* Tela larga: tabela */}
      <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm sm:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-bold">
                Lançamento
              </th>
              <th scope="col" className="px-4 py-2.5 font-bold">
                Categoria
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-bold">
                Valor
              </th>
              <th scope="col" className="px-4 py-2.5 font-bold">
                Prazo
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-bold">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lancamentos.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  <Link
                    href={`/interno/financeiro/lancamentos/${l.id}/editar`}
                    className="font-medium text-gray-900 hover:underline"
                  >
                    {l.description}
                  </Link>
                  {/* O cliente só aparece quando a descrição ainda não
                      o disse: "Mensalidade Kiku Sushi" com "Kiku Sushi"
                      embaixo é o mesmo nome duas vezes. */}
                  {clienteSeFizerFalta(l.description, l.client?.name ?? null) ? (
                    <span className="block text-xs text-gray-500">
                      {l.client?.name}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-2.5 text-gray-600">
                  {l.category?.name ?? ""}
                </td>
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-gray-900">
                  {valor(l)}
                </td>
                <td className={"px-4 py-2.5 " + corDoPrazo(l)}>
                  {textoDoPrazo(l, hoje)}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end">
                    <Acoes l={l} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        aberto={Boolean(excluindo)}
        titulo="Excluir lançamento?"
        descricao={
          excluindo
            ? `"${excluindo.description}" (${formatarMoeda(Number(excluindo.amount))}) sai do fluxo de caixa, e isso não dá para desfazer.`
            : undefined
        }
        textoConfirmar="Excluir"
        varianteConfirmar="perigo"
        carregando={processando}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setExcluindo(null)}
      />
    </>
  );
}
