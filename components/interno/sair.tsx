"use client";

import { useTransition } from "react";
import { signOutAction } from "@/lib/actions/auth";

/**
 * Botão de sair.
 *
 * Vive aqui porque o sistema interno é o único que sobrou nesta base de
 * código: o logout costumava morar na barra do sistema de demandas, que
 * saiu junto com ele. Sem este botão não haveria como trocar de conta —
 * e trocar de conta é justamente como se confere que "Meus gastos" é
 * privado de cada uma.
 */
export function Sair() {
  const [saindo, iniciar] = useTransition();

  return (
    <button
      type="button"
      onClick={() => iniciar(() => void signOutAction())}
      disabled={saindo}
      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
    >
      {saindo ? "Saindo..." : "Sair"}
    </button>
  );
}
