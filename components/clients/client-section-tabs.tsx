"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

export interface AbaCliente {
  id: string;
  label: string;
  icone: string;
  badge?: number;
  conteudo: ReactNode;
}

/**
 * Abas da ficha do cliente (Onboard, Conteúdos, Arquivos, Relatórios).
 * Todos os painéis são renderizados no servidor e só trocam de visibilidade
 * (sem recarregar), então nenhum perde o estado ao alternar.
 */
export function ClientSectionTabs({
  abas,
  padrao,
}: {
  abas: AbaCliente[];
  /** Aba aberta ao entrar (padrão: a primeira). */
  padrao?: string;
}) {
  const inicial =
    padrao && abas.some((a) => a.id === padrao) ? padrao : (abas[0]?.id ?? "");
  const [ativa, setAtiva] = useState<string>(inicial);

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center gap-5 overflow-x-auto border-b border-gray-200">
        {abas.map((aba) => {
          const on = ativa === aba.id;
          return (
            <button
              key={aba.id}
              type="button"
              onClick={() => setAtiva(aba.id)}
              className={
                "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-1 pb-2 text-sm font-semibold transition-colors " +
                (on
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-gray-500 hover:text-gray-800")
              }
            >
              <Icon nome={aba.icone} className="h-4 w-4" />
              {aba.label}
              {aba.badge && aba.badge > 0 ? (
                <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] font-bold text-gray-600">
                  {aba.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {abas.map((aba) => (
        <div key={aba.id} className={ativa === aba.id ? "" : "hidden"}>
          {aba.conteudo}
        </div>
      ))}
    </div>
  );
}
