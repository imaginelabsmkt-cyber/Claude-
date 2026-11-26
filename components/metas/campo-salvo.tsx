"use client";

import { useState, useTransition } from "react";
import { toast } from "@/lib/ui/toast";
import { useRouter } from "next/navigation";

/**
 * Um campo que salva ao sair dele.
 *
 * Sem botão "Salvar": a tela de metas é para mexer num número e ver
 * a conta mudar. Um botão por campo seria um clique entre a pergunta
 * e a resposta, vinte vezes seguidas.
 *
 * Se o valor não mudou, não grava nada — senão qualquer passagem de
 * foco viraria uma escrita no banco e um recarregamento da página.
 */
export function CampoSalvo({
  valor,
  aoSalvar,
  rotulo,
  largura = "w-28",
  alinhar = "text-right",
}: {
  valor: string;
  aoSalvar: (novo: string) => Promise<{ ok: boolean; error?: string }>;
  rotulo: string;
  largura?: string;
  alinhar?: string;
}) {
  const router = useRouter();
  const [processando, iniciar] = useTransition();
  const [erro, setErro] = useState(false);

  function salvar(novo: string) {
    if (novo === valor) return;
    iniciar(async () => {
      const r = await aoSalvar(novo);
      if (!r.ok) {
        setErro(true);
        toast.erro(r.error ?? "Não foi possível salvar.");
        return;
      }
      setErro(false);
      router.refresh();
    });
  }

  return (
    <input
      key={valor}
      type="text"
      inputMode="decimal"
      defaultValue={valor}
      disabled={processando}
      onBlur={(e) => salvar(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      aria-label={rotulo}
      className={
        "rounded-lg border px-2 py-1 text-sm tabular-nums text-gray-900 disabled:opacity-50 " +
        largura +
        " " +
        alinhar +
        " " +
        (erro ? "border-alerta" : "border-gray-300")
      }
    />
  );
}
