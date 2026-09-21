"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { reabrirLeadAction } from "@/lib/actions/comercial";
import { toast } from "@/lib/ui/toast";

/**
 * Devolve uma oportunidade encerrada ao funil, na etapa de negociação.
 * O que já foi criado no financeiro não é desfeito — se o negócio caiu
 * depois de fechado, o certo é pausar a mensalidade nas recorrências.
 */
export function ReabrirLead({ id }: { id: string }) {
  const router = useRouter();
  const [processando, iniciar] = useTransition();

  return (
    <Button
      variante="secundaria"
      tamanho="sm"
      disabled={processando}
      onClick={() =>
        iniciar(async () => {
          const r = await reabrirLeadAction(id);
          if (!r.ok) {
            toast.erro(r.error ?? "Não foi possível reabrir.");
            return;
          }
          toast.sucesso("Oportunidade de volta ao funil, em Negociação.");
          router.refresh();
        })
      }
    >
      {processando ? "Reabrindo..." : "Devolver ao funil"}
    </Button>
  );
}
