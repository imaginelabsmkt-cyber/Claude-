"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BuscaComando } from "@/components/interno/busca-comando";
import { InternoSidebar } from "@/components/interno/interno-sidebar";
import { Toaster } from "@/components/ui/toaster";
import { areaDaRota } from "@/lib/interno/areas";

interface InternoShellProps {
  children: ReactNode;
  nomeUsuario?: string;
}

/**
 * Estrutura do sistema interno: menu + barra superior + conteúdo.
 *
 * Mesma casca do sistema de demandas da Favie (topo translúcido de 4rem,
 * avatar à direita, menu em gaveta no celular) — é a mesma empresa, e
 * trocar de sistema não devia parecer trocar de produto.
 *
 * O `data-area` no wrapper é o que faz a tela inteira assumir a cor da
 * área aberta — todo componente que usa as classes `area`/`area-soft`
 * acompanha sem precisar receber a cor por props.
 */
export function InternoShell({ children, nomeUsuario }: InternoShellProps) {
  const [menuAberto, setMenuAberto] = useState(false);
  const pathname = usePathname();
  const ativa = areaDaRota(pathname);

  return (
    <div data-area={ativa} className="min-h-screen bg-gray-50">
      <Toaster />
      <InternoSidebar
        aberta={menuAberto}
        aoFechar={() => setMenuAberto(false)}
        nomeUsuario={nomeUsuario}
      />

      <div className="lg:pl-64">
        <header
          className="sticky top-0 z-20 flex min-h-[4rem] items-center gap-3 border-b border-gray-200 bg-white/80 px-4 backdrop-blur lg:px-6"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            className="-ml-1 rounded-lg p-2.5 text-gray-600 hover:bg-gray-100 active:bg-gray-200 lg:hidden"
            aria-label="Abrir menu"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" />
            </svg>
          </button>

          <BuscaComando />

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-gray-600 sm:inline">
              {nomeUsuario ?? "Usuário"}
            </span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {(nomeUsuario ?? "U").charAt(0).toUpperCase()}
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
