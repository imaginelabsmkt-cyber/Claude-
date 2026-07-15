"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { excluirPlanejamentoMesAction } from "@/lib/actions/contents";

interface DeletePlanningButtonProps {
  clientId: string;
  mes: string; // YYYY-MM
  quantidade: number;
  rotuloMes: string;
}

/** Apaga todo o planejamento (conteúdos) de um cliente num mês. */
export function DeletePlanningButton({
  clientId,
  mes,
  quantidade,
  rotuloMes,
}: DeletePlanningButtonProps) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [processando, iniciar] = useTransition();

  function excluir() {
    setErro(null);
    iniciar(async () => {
      const r = await excluirPlanejamentoMesAction(clientId, mes);
      if (!r.ok) {
        setErro(r.error ?? "Falha ao apagar.");
        return;
      }
      setAberto(false);
      router.refresh();
    });
  }

  if (quantidade === 0) return null;

  return (
    <>
      <Button variante="secundaria" onClick={() => setAberto(true)}>
        Apagar planejamento do mês
      </Button>
      {erro ? <p className="mt-1 text-xs text-red-600">{erro}</p> : null}
      <ConfirmDialog
        aberto={aberto}
        titulo={`Apagar planejamento de ${rotuloMes}?`}
        descricao={`Isso vai excluir os ${quantidade} conteúdo(s) deste cliente com mês de referência ${mes}. Esta ação não pode ser desfeita.`}
        textoConfirmar="Apagar tudo"
        varianteConfirmar="perigo"
        carregando={processando}
        aoConfirmar={excluir}
        aoCancelar={() => setAberto(false)}
      />
    </>
  );
}
