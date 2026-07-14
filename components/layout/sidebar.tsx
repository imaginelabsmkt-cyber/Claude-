"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAVEGACAO } from "@/lib/navigation";
import { NavIcon } from "@/components/layout/nav-icon";
import { cn } from "@/lib/utils";

interface SidebarProps {
  /** Controla a exibição no mobile (drawer). */
  aberta?: boolean;
  aoFechar?: () => void;
}

/**
 * Barra lateral de navegação.
 * Desktop: fixa à esquerda. Mobile: drawer sobreposto (controlado por `aberta`).
 */
export function Sidebar({ aberta = false, aoFechar }: SidebarProps) {
  const pathname = usePathname();

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
          "fixed inset-y-0 left-0 z-40 w-64 transform border-r border-gray-200 bg-white transition-transform lg:translate-x-0",
          aberta ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            A
          </div>
          <span className="font-semibold text-gray-900">Agência Social</span>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {NAVEGACAO.map((item) => {
            const ativo =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={aoFechar}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  ativo
                    ? "bg-brand-50 text-brand-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                )}
              >
                <NavIcon nome={item.icone} className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
