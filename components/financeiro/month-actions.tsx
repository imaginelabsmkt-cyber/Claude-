"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  copiarMesAction,
  gerarLancamentosDoMesAction,
} from "@/lib/actions/financeiro";
import { mesAnterior, rotuloMes } from "@/lib/financeiro/meses";
import { toast } from "@/lib/ui/toast";

interface MonthActionsProps {
  mes: string;
  /** Quantas recorrências ativas ainda não viraram lançamento neste mês. */
  recorrenciasPendentes: number;
}

/**
 * Ações de montagem do mês:
 *  - "Gerar do plano fixo": cria os lançamentos das recorrências ativas;
 *  - "Copiar mês anterior": repete os lançamentos do mês passado.
 *
 * Juntas substituem o trabalho manual de recriar a aba do mês na planilha.
 */
export function MonthActions({ mes, recorrenciasPendentes }: MonthActionsProps) {
  const router = useRouter();
  const [copiando, setCopiando] = useState(false);
  const [processando, iniciar] = useTransition();
  const anterior = mesAnterior(mes);

  function gerar() {
    iniciar(async () => {
      const r = await gerarLancamentosDoMesAction(mes);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível gerar os lançamentos.");
        return;
      }
      toast.sucesso(
        r.criados
          ? `${r.criados} lançamento(s) gerado(s) para ${rotuloMes(mes)}.`
          : "As recorrências deste mês já estavam geradas.",
      );
      router.refresh();
    });
  }

  function copiar() {
    iniciar(async () => {
      const r = await copiarMesAction(anterior, mes);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível copiar o mês.");
        return;
      }
      setCopiando(false);
      toast.sucesso(`${r.criados} lançamento(s) copiado(s) como pendentes.`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/interno/financeiro/lancamentos/novo?mes=${mes}`}>
        <Button>Novo lançamento</Button>
      </Link>

      <Button variante="secundaria" onClick={gerar} disabled={processando}>
        {processando
          ? "Processando..."
          : `Gerar do plano fixo${recorrenciasPendentes ? ` (${recorrenciasPendentes})` : ""}`}
      </Button>

      <Button
        variante="secundaria"
        onClick={() => setCopiando(true)}
        disabled={processando}
      >
        Copiar mês anterior
      </Button>

      <ConfirmDialog
        aberto={copiando}
        titulo={`Copiar ${rotuloMes(anterior)} para ${rotuloMes(mes)}?`}
        descricao="Todos os lançamentos do mês anterior serão recriados aqui como PENDENTES, mantendo valores e dia de vencimento. Nada é sobrescrito — os lançamentos que já existem neste mês permanecem."
        textoConfirmar="Copiar"
        carregando={processando}
        aoConfirmar={copiar}
        aoCancelar={() => setCopiando(false)}
      />
    </div>
  );
}
