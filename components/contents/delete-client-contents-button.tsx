"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { excluirTodosDoClienteAction } from "@/lib/actions/contents";
import { toast } from "@/lib/ui/toast";

interface Props {
  clientId: string;
  nome: string;
  quantidade: number;
}

/** Apaga TODOS os conteúdos de um cliente (todos os meses), com confirmação. */
export function DeleteClientContentsButton({
  clientId,
  nome,
  quantidade,
}: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [processando, iniciar] = useTransition();

  function excluir() {
    iniciar(async () => {
      const r = await excluirTodosDoClienteAction(clientId);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível apagar.");
        return;
      }
      toast.sucesso(`Planejamento de ${nome} apagado`);
      setAberto(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-md border border-red-200 px-2 py-0.5 text-[11px] font-semibold text-red-600 hover:bg-red-50"
      >
        Apagar tudo
      </button>
      <ConfirmDialog
        aberto={aberto}
        titulo={`Apagar todo o planejamento de ${nome}?`}
        descricao={`Isso exclui os ${quantidade} conteúdo(s) deste cliente (todos os meses). Esta ação não pode ser desfeita.`}
        textoConfirmar="Apagar tudo"
        varianteConfirmar="perigo"
        carregando={processando}
        aoConfirmar={excluir}
        aoCancelar={() => setAberto(false)}
      />
    </>
  );
}
