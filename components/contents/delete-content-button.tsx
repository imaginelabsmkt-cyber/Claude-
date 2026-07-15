"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { excluirConteudoAction } from "@/lib/actions/contents";

interface DeleteContentButtonProps {
  id: string;
  clientId?: string;
  /** Para onde ir após excluir (padrão: /conteudos). */
  redirecionarPara?: string;
}

/** Botão de excluir um conteúdo, com confirmação. */
export function DeleteContentButton({
  id,
  clientId,
  redirecionarPara = "/conteudos",
}: DeleteContentButtonProps) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [processando, iniciar] = useTransition();

  function excluir() {
    setErro(null);
    iniciar(async () => {
      const r = await excluirConteudoAction(id, clientId);
      if (!r.ok) {
        setErro(r.error ?? "Falha ao excluir.");
        return;
      }
      router.push(redirecionarPara);
      router.refresh();
    });
  }

  return (
    <>
      <Button variante="perigo" onClick={() => setAberto(true)}>
        Excluir
      </Button>
      {erro ? <p className="mt-1 text-xs text-red-600">{erro}</p> : null}
      <ConfirmDialog
        aberto={aberto}
        titulo="Excluir conteúdo?"
        descricao="Esta ação não pode ser desfeita. O histórico e os comentários deste conteúdo também serão apagados."
        textoConfirmar="Excluir"
        varianteConfirmar="perigo"
        carregando={processando}
        aoConfirmar={excluir}
        aoCancelar={() => setAberto(false)}
      />
    </>
  );
}
