"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  gerarLancamentosDoMesAction,
  previaDasContasFixasAction,
  type ItemConferidoNaTela,
} from "@/lib/actions/financeiro";
import { ConferirContasFixas } from "@/components/financeiro/conferir-contas-fixas";
import { rotuloMes } from "@/lib/financeiro/meses";
import { toast } from "@/lib/ui/toast";

interface MonthActionsProps {
  mes: string;
  /** Quantas contas fixas ativas ainda não viraram lançamento neste mês. */
  recorrenciasPendentes: number;
}

/**
 * A barra de ações do mês. UM botão de destaque e um campo de busca.
 *
 * Era uma fila de quatro: "Novo lançamento", "Gerar do plano fixo",
 * "Procurar um lançamento" e "Calculadora" — quatro coisas com o
 * mesmo peso visual, das quais uma se usa o dia inteiro, uma se usa
 * uma vez por mês e duas quase nunca.
 *
 * Agora:
 *
 *   + LANÇAR        o único botão. É o que se faz todo dia.
 *   PROCURAR        campo de busca, não link: o que a pessoa quer é
 *                   digitar o nome, não chegar numa tela de busca.
 *   CALCULADORA     foi para a engrenagem.
 *   CONTAS FIXAS    deixou de ser botão. Virou o aviso amarelo
 *                   embaixo, que só aparece quando falta lançar — e
 *                   some sozinho quando não falta. Botão fixo para
 *                   uma tarefa de uma vez por mês pede atenção 30
 *                   dias para ser útil em 1.
 */
export function MonthActions({ mes, recorrenciasPendentes }: MonthActionsProps) {
  const router = useRouter();
  const [processando, iniciar] = useTransition();
  const [itens, setItens] = useState<ItemConferidoNaTela[] | null>(null);
  const [busca, setBusca] = useState("");

  /* "Preparar o mês" NÃO lança nada: abre a conferência. Do documento
     da Favie — "antes de criar os lançamentos, mostrar a lista para
     vocês conferirem". */
  function abrirConferencia() {
    iniciar(async () => {
      const r = await previaDasContasFixasAction(mes);
      if (!r.ok || !r.itens) {
        toast.erro(r.error ?? "Não foi possível ler as contas fixas.");
        return;
      }
      setItens(r.itens);
    });
  }

  function gerar(escolha: { id: string; amount: number }[]) {
    iniciar(async () => {
      const r = await gerarLancamentosDoMesAction(mes, escolha);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível lançar as contas fixas.");
        return;
      }
      setItens(null);
      toast.sucesso(
        r.criados
          ? `${r.criados} lançamento(s) criado(s) em ${rotuloMes(mes)}.`
          : "Nada novo para lançar neste mês.",
      );
      router.refresh();
    });
  }

  function procurar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = busca.trim();
    router.push(
      `/interno/financeiro/lancamentos?mes=${mes}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/interno/financeiro/lancamentos/novo?mes=${mes}`}>
          <Button>+ Lançar</Button>
        </Link>

        {/* Busca, não link: o caminho curto é digitar o nome aqui. */}
        <form onSubmit={procurar} className="min-w-0 flex-1 basis-48">
          <label className="relative block">
            <span className="sr-only">Procurar um lançamento</span>
            <Icon
              nome="search"
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Procurar"
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400"
            />
          </label>
        </form>
      </div>

      {/* O aviso. Só existe enquanto houver conta fixa sem lançar. */}
      {recorrenciasPendentes > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
          <Icon
            nome="alert"
            aria-hidden
            className="h-4 w-4 shrink-0 text-amber-700"
          />
          <p className="min-w-0 flex-1 text-sm text-amber-900">
            Contas fixas de {rotuloMes(mes)} ainda não lançadas
            <span className="text-amber-700"> · {recorrenciasPendentes}</span>
          </p>
          <button
            type="button"
            onClick={abrirConferencia}
            disabled={processando}
            className="shrink-0 text-sm font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950 disabled:opacity-60"
          >
            {processando ? "Abrindo..." : "Preparar o mês"}
          </button>
        </div>
      ) : null}

      {itens ? (
        <ConferirContasFixas
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
