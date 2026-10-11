"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { gerarLancamentosDoMesAction } from "@/lib/actions/financeiro";
import { rotuloMes } from "@/lib/financeiro/meses";
import { toast } from "@/lib/ui/toast";

interface MonthActionsProps {
  mes: string;
  /** Quantas recorrências ativas ainda não viraram lançamento neste mês. */
  recorrenciasPendentes: number;
}

/**
 * Ações de montagem do mês. Duas, e só duas:
 *  - "Novo lançamento": o que é avulso;
 *  - "Gerar do plano fixo": o que repete todo mês, a partir das recorrências.
 *
 * Existia também um "Copiar mês anterior". Saiu: ele repetia TUDO do mês
 * passado, inclusive o que foi compra única, e o plano fixo já cobre o que
 * de fato repete — sem risco de duplicar (uma recorrência só gera uma vez
 * por mês, garantido pelo banco).
 */
export function MonthActions({ mes, recorrenciasPendentes }: MonthActionsProps) {
  const router = useRouter();
  const [processando, iniciar] = useTransition();

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
    </div>
  );
}
