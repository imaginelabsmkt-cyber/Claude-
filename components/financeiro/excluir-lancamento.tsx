"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { excluirLancamentoAction } from "@/lib/actions/financeiro";
import { toast } from "@/lib/ui/toast";
import { formatarMoeda } from "@/lib/utils";

interface ExcluirLancamentoProps {
  id: string;
  descricao: string;
  valor: number;
  /** Para onde voltar depois de excluir. */
  voltarPara: string;
}

/**
 * Excluir um lançamento, a partir da tela de edição.
 *
 * "Quero excluir, como faz?" — não fazia. Excluir existia só na lista
 * de Lançamentos, que deixou de ser aba; na folha do mês, que é a tela
 * que ela usa, dava para marcar, corrigir o valor e editar, mas o que
 * tinha sido lançado errado ficava lá para sempre.
 *
 * Fica aqui, e não na linha da folha, por dois motivos: a linha já tem
 * cinco coisas, e excluir ao lado de "dar baixa" num dedo de celular é
 * o tipo de erro que não tem desfazer. Um clique em "Editar" e está
 * aqui embaixo, separado do resto, com a confirmação dizendo o nome e
 * o valor do que vai sair.
 */
export function ExcluirLancamento({
  id,
  descricao,
  valor,
  voltarPara,
}: ExcluirLancamentoProps) {
  const router = useRouter();
  const [perguntando, setPerguntando] = useState(false);
  const [processando, iniciar] = useTransition();

  function confirmar() {
    iniciar(async () => {
      const r = await excluirLancamentoAction(id);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível excluir.");
        return;
      }
      setPerguntando(false);
      toast.sucesso("Lançamento excluído.");
      router.push(voltarPara);
      router.refresh();
    });
  }

  return (
    <>
      <div className="mt-6 flex justify-end border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={() => setPerguntando(true)}
          disabled={processando}
          className="rounded-lg px-3 py-2 text-sm font-medium text-alerta hover:bg-alerta-soft disabled:opacity-50"
        >
          Excluir lançamento
        </button>
      </div>

      <ConfirmDialog
        aberto={perguntando}
        titulo="Excluir lançamento?"
        descricao={`"${descricao}" (${formatarMoeda(valor)}) sai do mês, e isso não dá para desfazer.`}
        textoConfirmar="Excluir"
        varianteConfirmar="perigo"
        carregando={processando}
        aoConfirmar={confirmar}
        aoCancelar={() => setPerguntando(false)}
      />
    </>
  );
}
