"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { definirStatusLancamentoAction } from "@/lib/actions/financeiro";
import { toast } from "@/lib/ui/toast";

interface BaixaRapidaProps {
  id: string;
  pago: boolean;
  /** Para o leitor de tela saber de qual linha é o check. */
  descricao: string;
}

/**
 * O CHECK de pago, na linha.
 *
 * É caixinha de marcar, e não botão, porque é isso que a planilha tem e
 * é isso que a Fran pediu: ela vai descendo a lista e marcando o que
 * pagou. Botão com texto obriga a ler cada um; caixinha é uma coluna só
 * e o olho desce.
 *
 * Marcar baixa o lançamento e a página recarrega sozinha, então os
 * totais, a barra de situação e o saldo do mês acompanham na hora.
 */
export function BaixaRapida({ id, pago, descricao }: BaixaRapidaProps) {
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
      router.refresh();
    });
  }

  return (
    <label
      className="flex cursor-pointer items-center"
      title={pago ? "Desmarcar" : "Marcar como pago"}
    >
      <input
        type="checkbox"
        checked={pago}
        onChange={alternar}
        disabled={processando}
        className="h-[18px] w-[18px] cursor-pointer rounded border-gray-300 accent-green-700 disabled:opacity-50"
      />
      <span className="sr-only">
        {pago ? `Desmarcar ${descricao}` : `Marcar ${descricao} como pago`}
      </span>
    </label>
  );
}
