"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BuscaComando } from "@/components/interno/busca-comando";
import { InternoSidebar } from "@/components/interno/interno-sidebar";
import { Toaster } from "@/components/ui/toaster";
import { areaDaRota } from "@/lib/interno/areas";

interface InternoShellProps {
  children: ReactNode;
  nomeUsuario?: string;
  /** Quantos clientes ativos a agência tem agora. */
  clientesAtivos?: number;
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
export function InternoShell({
  children,
  nomeUsuario,
  clientesAtivos,
}: InternoShellProps) {
  const [menuAberto, setMenuAberto] = useState(false);
  const pathname = usePathname();
  const ativa = areaDaRota(pathname);

  return (
    <div data-area={ativa} className="min-h-screen bg-papel">
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
            {/* O quantitativo de clientes, em toda tela do interno.
                Fica aqui e não num cartão de painel porque o pedido foi
                "quero que SEMPRE apareça": a barra do topo é o único
                lugar que acompanha a pessoa pelo sistema inteiro. É
                link, então o número também é o caminho para a lista. */}
            {typeof clientesAtivos === "number" ? (
              <Link
                href="/interno/administrativo/clientes"
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-100"
                title={`${clientesAtivos} ${clientesAtivos === 1 ? "cliente ativo" : "clientes ativos"}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 shrink-0 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    d="M17 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 8.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM22 20v-2a4 4 0 0 0-3-3.87M16 1.13a4 4 0 0 1 0 7.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="font-semibold tabular-nums">
                  {clientesAtivos}
                </span>
                <span className="hidden sm:inline">
                  {clientesAtivos === 1 ? "cliente" : "clientes"}
                </span>
              </Link>
            ) : null}

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
