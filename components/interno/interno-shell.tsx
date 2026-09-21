"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { InternoSidebar } from "@/components/interno/interno-sidebar";
import { Toaster } from "@/components/ui/toaster";
import { areaDaRota } from "@/lib/interno/areas";

interface InternoShellProps {
  children: ReactNode;
  nomeUsuario?: string;
}

/**
 * Estrutura do sistema interno: menu + conteúdo.
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
      <InternoSidebar aberta={menuAberto} aoFechar={() => setMenuAberto(false)} />

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:px-8">
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
            aria-label="Abrir menu"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <span className="text-sm font-medium text-gray-400 lg:hidden">favie interno</span>
          <span className="ml-auto text-sm text-gray-500">{nomeUsuario}</span>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
