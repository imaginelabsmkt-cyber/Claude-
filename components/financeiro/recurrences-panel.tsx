"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { RecurrenceForm } from "@/components/financeiro/recurrence-form";
import {
  definirAtivaRecorrenciaAction,
  excluirRecorrenciaAction,
} from "@/lib/actions/financeiro";
import { rotuloMesCurto } from "@/lib/financeiro/meses";
import { toast } from "@/lib/ui/toast";
import { formatarMoeda } from "@/lib/utils";
import { FINANCIAL_KIND_TONE } from "@/types";
import type {
  Client,
  FinancialCategory,
  FinancialRecurrenceWithRelations,
} from "@/types";

interface RecurrencesPanelProps {
  mes: string;
  recorrencias: FinancialRecurrenceWithRelations[];
  categorias: FinancialCategory[];
  clientes: Pick<Client, "id" | "name" | "active">[];
}

/**
 * Tela de recorrências: o "contrato" de cada mensalidade e custo fixo.
 * É a lista que a planilha repetia manualmente em cada aba mensal.
 */
export function RecurrencesPanel({
  mes,
  recorrencias,
  categorias,
  clientes,
}: RecurrencesPanelProps) {
  const router = useRouter();
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<FinancialRecurrenceWithRelations | null>(
    null,
  );
  const [processando, iniciar] = useTransition();

  const ativas = recorrencias.filter((r) => r.active);
  const receitaMensal = ativas
    .filter((r) => r.kind === "Receita")
    .reduce((t, r) => t + Number(r.amount), 0);
  const despesaMensal = ativas
    .filter((r) => r.kind === "Despesa")
    .reduce((t, r) => t + Number(r.amount), 0);

  function alternarAtiva(r: FinancialRecurrenceWithRelations) {
    iniciar(async () => {
      const resultado = await definirAtivaRecorrenciaAction(r.id, !r.active);
      if (!resultado.ok) {
        toast.erro(resultado.error ?? "Não foi possível atualizar.");
        return;
      }
      toast.sucesso(r.active ? "Recorrência pausada." : "Recorrência reativada.");
      router.refresh();
    });
  }

  function confirmarExclusao() {
    if (!excluindo) return;
    const id = excluindo.id;
    iniciar(async () => {
      const resultado = await excluirRecorrenciaAction(id);
      if (!resultado.ok) {
        toast.erro(resultado.error ?? "Não foi possível excluir.");
        return;
      }
      setExcluindo(null);
      toast.sucesso("Recorrência excluída. Os lançamentos já gerados foram mantidos.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Receita recorrente / mês
          </p>
          <p className="mt-1 text-xl font-bold text-green-700">
            {formatarMoeda(receitaMensal)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Custo fixo / mês
          </p>
          <p className="mt-1 text-xl font-bold text-red-600">
            {formatarMoeda(despesaMensal)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Sobra recorrente
          </p>
          <p
            className={
              "mt-1 text-xl font-bold " +
              (receitaMensal - despesaMensal >= 0 ? "text-green-700" : "text-red-600")
            }
          >
            {formatarMoeda(receitaMensal - despesaMensal)}
          </p>
        </Card>
      </div>

      {criando ? (
        <Card>
          <CardHeader>
            <CardTitle>Nova recorrência</CardTitle>
          </CardHeader>
          <CardContent>
            <RecurrenceForm
              mes={mes}
              categorias={categorias}
              clientes={clientes}
              aoConcluir={() => setCriando(false)}
            />
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setCriando(true)}>Nova recorrência</Button>
      )}

      {recorrencias.length === 0 ? (
        <EmptyState
          titulo="Nenhuma recorrência cadastrada"
          descricao="Cadastre as mensalidades dos clientes e os custos fixos. Depois, em cada mês, um clique em 'Gerar do plano fixo' cria todos os lançamentos."
        />
      ) : (
        <div className="space-y-3">
          {recorrencias.map((r) =>
            editando === r.id ? (
              <Card key={r.id}>
                <CardHeader>
                  <CardTitle>Editar recorrência</CardTitle>
                </CardHeader>
                <CardContent>
                  <RecurrenceForm
                    mes={mes}
                    categorias={categorias}
                    clientes={clientes}
                    recorrencia={r}
                    aoConcluir={() => setEditando(null)}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card
                key={r.id}
                className={"p-4 " + (r.active ? "" : "opacity-60")}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900">{r.description}</span>
                      <Badge tom={FINANCIAL_KIND_TONE[r.kind]}>{r.kind}</Badge>
                      {r.active ? null : <Badge tom="cinza">Pausada</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {r.category?.name ?? "Sem categoria"}
                      {r.client ? ` · ${r.client.name}` : ""}
                      {r.due_day ? ` · vence dia ${r.due_day}` : ""}
                      {` · desde ${rotuloMesCurto(r.start_month)}`}
                      {r.end_month ? ` até ${rotuloMesCurto(r.end_month)}` : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={
                        "font-semibold " +
                        (r.kind === "Receita" ? "text-green-700" : "text-red-600")
                      }
                    >
                      {formatarMoeda(Number(r.amount))}
                    </span>
                    <Button
                      tamanho="sm"
                      variante="secundaria"
                      onClick={() => setEditando(r.id)}
                    >
                      Editar
                    </Button>
                    <Button
                      tamanho="sm"
                      variante="secundaria"
                      onClick={() => alternarAtiva(r)}
                      disabled={processando}
                    >
                      {r.active ? "Pausar" : "Reativar"}
                    </Button>
                    <Button
                      tamanho="sm"
                      variante="fantasma"
                      onClick={() => setExcluindo(r)}
                      disabled={processando}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              </Card>
            ),
          )}
        </div>
      )}

      <ConfirmDialog
        aberto={Boolean(excluindo)}
        titulo="Excluir recorrência?"
        descricao={
          excluindo
            ? `"${excluindo.description}" deixará de gerar lançamentos. Os lançamentos já criados nos meses anteriores permanecem no fluxo de caixa. Se for só uma pausa, prefira "Pausar".`
            : undefined
        }
        textoConfirmar="Excluir"
        varianteConfirmar="perigo"
        carregando={processando}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setExcluindo(null)}
      />
    </div>
  );
}
