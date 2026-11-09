"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { definirStatusLancamentoAction } from "@/lib/actions/financeiro";
import { toast } from "@/lib/ui/toast";

interface BaixaRapidaProps {
  id: string;
  pago: boolean;
}

/**
 * O botão de dar baixa, direto na linha do mês.
 *
 * Existe para a tela do mês fazer o que a aba do mês da planilha fazia:
 * a Fran abre o mês, vê a lista e marca o que pagou, no mesmo lugar.
 * Antes ela via numa tela e agia em outra, e foi por isso que ela disse
 * que a planilha era mais simples que o sistema. Estava.
 *
 * É um componente de cliente minúsculo de propósito: a folha do mês
 * inteira continua sendo montada no servidor, e só este botão carrega
 * JavaScript.
 */
export function BaixaRapida({ id, pago }: BaixaRapidaProps) {
  const router = useRouter();
  const [processando, iniciar] = useTransition();

  function alternar() {
    iniciar(async () => {
      const novo = pago ? "Pendente" : "Pago";
      const r = await definirStatusLancamentoAction(id, novo);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível atualizar.");
        return;
      }
      toast.sucesso(pago ? "Reaberto." : "Baixado.");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={processando}
      className={
        pago
          ? "rounded px-1.5 py-0.5 text-xs font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
          : "rounded border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
      }
    >
      {pago ? "Reabrir" : "Dar baixa"}
    </button>
  );
}
