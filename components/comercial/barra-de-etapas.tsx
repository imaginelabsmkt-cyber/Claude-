"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { moverEtapaAction } from "@/lib/actions/comercial";
import { ETAPAS_ABERTAS } from "@/lib/comercial/funil";
import { toast } from "@/lib/ui/toast";
import { cn } from "@/lib/utils";
import type { LeadStage } from "@/types";

/**
 * A barra de etapas, clicável, direto da ficha.
 *
 * Do raio-X do Zoho: "a Visão geral traz uma barra clicável com as
 * situações do lead". Aqui, mudar de etapa só dava para fazer
 * arrastando no quadro: quem estava lendo a ficha tinha que voltar,
 * achar o cartão e arrastar. Em celular, arrastar cartão entre
 * colunas que rolam de lado é a pior interação do sistema.
 *
 * Cada etapa até a atual fica preenchida: a barra conta a história
 * (por onde já passou) e não só o estado de agora.
 */
export function BarraDeEtapas({
  leadId,
  etapa,
  encerrada,
}: {
  leadId: string;
  etapa: LeadStage;
  /** Ganha ou perdida: a barra vira leitura, sem clique. */
  encerrada: boolean;
}) {
  const router = useRouter();
  const [movendo, iniciar] = useTransition();

  const atual = ETAPAS_ABERTAS.indexOf(etapa);

  function mover(destino: LeadStage) {
    if (destino === etapa) return;
    iniciar(async () => {
      const r = await moverEtapaAction(leadId, destino);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível mover.");
        return;
      }
      toast.sucesso(`Movida para ${destino}.`);
      router.refresh();
    });
  }

  return (
    <div
      className="flex flex-wrap gap-1"
      role="group"
      aria-label="Etapa da oportunidade"
    >
      {ETAPAS_ABERTAS.map((e, i) => {
        const passou = atual >= 0 && i <= atual;
        const aqui = e === etapa;
        return (
          <button
            key={e}
            type="button"
            onClick={() => mover(e)}
            disabled={movendo || encerrada}
            aria-current={aqui ? "step" : undefined}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
              aqui
                ? "bg-area text-white"
                : passou
                  ? "bg-area-soft text-area"
                  : "bg-gray-100 text-gray-500",
              !encerrada && !aqui && "hover:bg-gray-200",
              (movendo || encerrada) && "cursor-default opacity-70",
            )}
          >
            {e}
          </button>
        );
      })}
    </div>
  );
}
