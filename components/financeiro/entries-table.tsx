"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  definirStatusLancamentoAction,
  excluirLancamentoAction,
} from "@/lib/actions/financeiro";
import { toast } from "@/lib/ui/toast";
import { formatarData, formatarMoeda } from "@/lib/utils";
import { FINANCIAL_STATUS_TONE } from "@/types";
import type { FinancialEntryWithRelations } from "@/types";

interface EntriesTableProps {
  lancamentos: FinancialEntryWithRelations[];
}

/**
 * Tabela de lançamentos com as duas ações do dia a dia: dar baixa
 * (Pendente <-> Pago) e excluir. Em telas pequenas vira lista de cards.
 */
export function EntriesTable({ lancamentos }: EntriesTableProps) {
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
        novo === "Pago" ? "Lançamento marcado como pago." : "Lançamento reaberto.",
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

  const sinal = (l: FinancialEntryWithRelations) =>
    l.kind === "Receita" ? "text-green-700" : "text-red-600";

  return (
    <>
      {/* Celular: cards */}
      <div className="space-y-3 sm:hidden">
        {lancamentos.map((l) => (
          <div
            key={l.id}
            className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900">{l.description}</p>
                <p className="mt-0.5 truncate text-xs text-gray-500">
                  {l.category?.name ?? "Sem categoria"}
                  {l.client ? ` · ${l.client.name}` : ""}
                </p>
              </div>
              <span className={`shrink-0 font-semibold ${sinal(l)}`}>
                {l.kind === "Receita" ? "+" : "−"} {formatarMoeda(Number(l.amount))}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <Badge tom={FINANCIAL_STATUS_TONE[l.status]}>{l.status}</Badge>
              <span>Venc.: {formatarData(l.due_date)}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                tamanho="sm"
                variante={l.status === "Pago" ? "secundaria" : "primaria"}
                onClick={() => alternarStatus(l)}
                disabled={processando}
              >
                {l.status === "Pago" ? "Reabrir" : "Marcar pago"}
              </Button>
              <Link href={`/interno/financeiro/lancamentos/${l.id}/editar`}>
                <Button tamanho="sm" variante="secundaria">
                  Editar
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop/tablet: tabela */}
      <Card className="hidden overflow-hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Vencimento</th>
                <th className="px-4 py-3 text-right font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Situação</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lancamentos.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/interno/financeiro/lancamentos/${l.id}/editar`}
                      className="font-medium text-gray-900 hover:text-brand-700"
                    >
                      {l.description}
                    </Link>
                    {l.payment_method ? (
                      <span className="ml-2 text-xs text-gray-400">
                        {l.payment_method}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {l.category?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{l.client?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatarData(l.due_date)}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${sinal(l)}`}>
                    {l.kind === "Receita" ? "+" : "−"} {formatarMoeda(Number(l.amount))}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tom={FINANCIAL_STATUS_TONE[l.status]}>{l.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        tamanho="sm"
                        variante={l.status === "Pago" ? "secundaria" : "primaria"}
                        onClick={() => alternarStatus(l)}
                        disabled={processando}
                      >
                        {l.status === "Pago" ? "Reabrir" : "Marcar pago"}
                      </Button>
                      <Button
                        tamanho="sm"
                        variante="fantasma"
                        onClick={() => setExcluindo(l)}
                        disabled={processando}
                      >
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmDialog
        aberto={Boolean(excluindo)}
        titulo="Excluir lançamento?"
        descricao={
          excluindo
            ? `"${excluindo.description}" (${formatarMoeda(Number(excluindo.amount))}) será removido do fluxo de caixa. Esta ação não pode ser desfeita.`
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
