"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navegacaoPara } from "@/lib/navigation";
import { NavIcon } from "@/components/layout/nav-icon";
import { signOutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

interface SidebarProps {
  /** Controla a exibição no mobile (drawer). */
  aberta?: boolean;
  aoFechar?: () => void;
  nomeUsuario?: string;
  papelUsuario?: string;
  papel?: UserRole | null;
}

/**
 * Barra lateral de navegação.
 * Desktop: fixa à esquerda. Mobile: drawer sobreposto (controlado por `aberta`).
 * Rodapé exibe o usuário autenticado e o botão de sair.
 */
export function Sidebar({
  aberta = false,
  aoFechar,
  nomeUsuario,
  papelUsuario,
  papel = null,
}: SidebarProps) {
  const pathname = usePathname();
  const itens = navegacaoPara(papel);

  return (
    <>
      {/* Overlay no mobile */}
      {aberta ? (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={aoFechar}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col border-r border-gray-200 bg-white transition-transform lg:translate-x-0",
          aberta ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center border-b border-gray-200 px-5">
          <span className="text-lg font-bold tracking-tight text-brand-600">
            Favie
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {itens.map((item) => {
            const ativo =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={aoFechar}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  ativo
                    ? "bg-brand-50 text-brand-700"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                )}
              >
                <NavIcon nome={item.icone} className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Rodapé: usuário + sair */}
        <div className="border-t border-gray-200 p-3">
          <div className="mb-2 flex items-center gap-3 px-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {(nomeUsuario ?? "U").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">
                {nomeUsuario ?? "Usuário"}
              </p>
              {papelUsuario ? (
                <p className="truncate text-xs text-gray-500">{papelUsuario}</p>
              ) : null}
            </div>
          </div>

          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 shrink-0"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Sair
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
