"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Somadora } from "@/components/financeiro/somadora";
import {
  gerarLancamentosDoMesAction,
  previaDoPlanoFixoAction,
  type ItemConferidoNaTela,
} from "@/lib/actions/financeiro";
import { ConferirPlanoFixo } from "@/components/financeiro/conferir-plano-fixo";
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
 * Mais o link de procurar, que era uma fila de links no pé da tela.
 * Esta fila é O QUE FAZER; as abas lá em cima são ONDE IR. Eram
 * quatro lugares com navegação na mesma tela.
 *
 * Existia também um "Copiar mês anterior". Saiu: ele repetia TUDO do mês
 * passado, inclusive o que foi compra única, e o plano fixo já cobre o que
 * de fato repete — sem risco de duplicar (uma recorrência só gera uma vez
 * por mês, garantido pelo banco).
 */
export function MonthActions({ mes, recorrenciasPendentes }: MonthActionsProps) {
  const router = useRouter();
  const [processando, iniciar] = useTransition();
  const [itens, setItens] = useState<ItemConferidoNaTela[] | null>(null);

  /* Clicar no botão NÃO lança mais nada: abre a conferência. Do
     documento da Favie — "antes de criar os lançamentos, mostrar a
     lista para vocês conferirem". */
  function abrirConferencia() {
    iniciar(async () => {
      const r = await previaDoPlanoFixoAction(mes);
      if (!r.ok || !r.itens) {
        toast.erro(r.error ?? "Não foi possível ler o plano fixo.");
        return;
      }
      setItens(r.itens);
    });
  }

  function gerar(escolha: { id: string; amount: number }[]) {
    iniciar(async () => {
      const r = await gerarLancamentosDoMesAction(mes, escolha);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível gerar os lançamentos.");
        return;
      }
      setItens(null);
      toast.sucesso(
        r.criados
          ? `${r.criados} lançamento(s) gerado(s) para ${rotuloMes(mes)}.`
          : "Nada novo para gerar neste mês.",
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/interno/financeiro/lancamentos/novo?mes=${mes}`}>
        <Button>Novo lançamento</Button>
      </Link>

      <Button
        variante="secundaria"
        onClick={abrirConferencia}
        disabled={processando}
      >
        {processando
          ? "Processando..."
          : `Gerar do plano fixo${recorrenciasPendentes ? ` (${recorrenciasPendentes})` : ""}`}
      </Button>

      {/* Procurar é coisa que se FAZ, então mora na fila de botões,
          junto com lançar e gerar. Antes era um link solto no pé da
          página, numa terceira fila de navegação. */}
      <Link
        href={`/interno/financeiro/lancamentos?mes=${mes}`}
        className="self-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:underline"
      >
        Procurar um lançamento
      </Link>

      <Somadora />

      {itens ? (
        <ConferirPlanoFixo
          mes={mes}
          itens={itens}
          processando={processando}
          aoGerar={gerar}
          aoCancelar={() => setItens(null)}
        />
      ) : null}
    </div>
  );
}
