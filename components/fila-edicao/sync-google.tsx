"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { sincronizarEdicoesGoogleAction } from "@/lib/actions/contents";

/**
 * Dispara o sync inverso do Google (dia de edição) EM SEGUNDO PLANO, depois que
 * a página já carregou — assim a Fila de edição abre na hora, sem esperar o
 * Google. Se algo mudou, atualiza a tela. Roda uma vez por carregamento.
 */
export function SyncGoogleEdicoes() {
  const router = useRouter();
  const jaRodou = useRef(false);

  useEffect(() => {
    if (jaRodou.current) return;
    jaRodou.current = true;
    let vivo = true;
    sincronizarEdicoesGoogleAction()
      .then((r) => {
        if (vivo && r.mudou > 0) router.refresh();
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [router]);

  return null;
}
