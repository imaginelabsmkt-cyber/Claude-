"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { definirAtivoClienteAction } from "@/lib/actions/clients";

interface ActiveToggleProps {
  id: string;
  ativo: boolean;
}

/**
 * Botão de ativar/desativar cliente.
 * - Desativar exige CONFIRMAÇÃO (é uma ação relevante).
 * - Ativar é direto.
 * Não existe exclusão definitiva de clientes.
 */
export function ActiveToggle({ id, ativo }: ActiveToggleProps) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [processando, iniciar] = useTransition();

  function alterar(novoAtivo: boolean) {
    setErro(null);
    iniciar(async () => {
      const r = await definirAtivoClienteAction(id, novoAtivo);
      if (!r.ok) {
        setErro(r.error ?? "Não foi possível atualizar o status.");
        return;
      }
      setConfirmando(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {ativo ? (
        <Button
          variante="secundaria"
          onClick={() => setConfirmando(true)}
          disabled={processando}
        >
          Desativar
        </Button>
      ) : (
        <Button onClick={() => alterar(true)} disabled={processando}>
          {processando ? "Ativando..." : "Ativar"}
        </Button>
      )}

      {erro ? <p className="text-xs text-red-600">{erro}</p> : null}

      <ConfirmDialog
        aberto={confirmando}
        titulo="Desativar cliente?"
        descricao="O cliente ficará inativo, mas nada será excluído. Você pode reativá-lo depois."
        textoConfirmar="Desativar"
        varianteConfirmar="perigo"
        carregando={processando}
        aoConfirmar={() => alterar(false)}
        aoCancelar={() => setConfirmando(false)}
      />
    </div>
  );
}
