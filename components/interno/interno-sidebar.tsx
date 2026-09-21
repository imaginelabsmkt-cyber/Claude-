"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AREAS_MENU, areaDaRota } from "@/lib/interno/areas";
import { cn } from "@/lib/utils";

interface InternoSidebarProps {
  aberta?: boolean;
  aoFechar?: () => void;
}

/**
 * Menu do sistema interno. Cada área carrega a própria cor — a bolinha
 * sempre, e o fundo quando é a área aberta. É o mesmo código de cor que
 * aparece nas tarjas das listas.
 */
export function InternoSidebar({ aberta = false, aoFechar }: InternoSidebarProps) {
  const pathname = usePathname();
  const ativa = areaDaRota(pathname);
  const noInicio = pathname === "/interno";

  return (
    <>
      {aberta ? (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={aoFechar}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 transform flex-col border-r border-gray-200 bg-white transition-transform lg:translate-x-0",
          aberta ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="border-b border-gray-200 px-5 py-4">
          <span className="block text-xl font-bold leading-none tracking-tight text-gray-900">
            favie
          </span>
          <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.22em] text-gray-400">
            interno
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          <Link
            href="/interno"
            onClick={aoFechar}
            data-area="inicio"
            aria-current={noInicio ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
              noInicio
                ? "bg-area-soft font-semibold text-area"
                : "text-gray-600 hover:bg-gray-50",
            )}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-area" />
            Início
          </Link>

          <div className="my-2 h-px bg-gray-200" />

          {AREAS_MENU.map((a) => {
            const on = ativa === a.id;
            return (
              <Link
                key={a.id}
                href={a.href}
                onClick={aoFechar}
                data-area={a.id}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  on
                    ? "bg-area-soft font-semibold text-area"
                    : "text-gray-600 hover:bg-gray-50",
                )}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-area" />
                {a.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-3">
          <Link
            href="/"
            onClick={aoFechar}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 14l-4-4 4-4M5 10h11a4 4 0 0 1 0 8h-1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Trocar de sistema
          </Link>
        </div>
      </aside>
    </>
  );
}
