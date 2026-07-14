"use client";

interface TopbarProps {
  /** Nome do usuário autenticado (exibido à direita). */
  nomeUsuario?: string;
  aoAbrirMenu?: () => void;
}

/**
 * Barra superior. No mobile exibe o botão de menu (abre a Sidebar).
 * Ações de sessão (ex.: sair) serão adicionadas em etapa posterior.
 */
export function Topbar({ nomeUsuario, aoAbrirMenu }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 px-4 backdrop-blur lg:px-6">
      <button
        type="button"
        onClick={aoAbrirMenu}
        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
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

      <div className="ml-auto flex items-center gap-3">
        <span className="text-sm text-gray-600">{nomeUsuario ?? "Usuário"}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
          {(nomeUsuario ?? "U").charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
