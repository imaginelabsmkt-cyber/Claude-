"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Toaster } from "@/components/ui/toaster";
import type { UserRole } from "@/types";

interface AppShellProps {
  children: ReactNode;
  nomeUsuario?: string;
  papelUsuario?: string;
  papel?: UserRole | null;
  /** Google conectou antes mas caiu: mostra o aviso pra reconectar. */
  googleRevogado?: boolean;
}

/**
 * Estrutura visual das páginas autenticadas: sidebar + topbar + conteúdo.
 * Gerencia o estado de abertura da sidebar no mobile.
 */
export function AppShell({
  children,
  nomeUsuario,
  papelUsuario,
  papel,
  googleRevogado,
}: AppShellProps) {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      <Sidebar
        aberta={menuAberto}
        aoFechar={() => setMenuAberto(false)}
        nomeUsuario={nomeUsuario}
        papelUsuario={papelUsuario}
        papel={papel}
      />

      <div className="lg:pl-64">
        <Topbar
          nomeUsuario={nomeUsuario}
          aoAbrirMenu={() => setMenuAberto(true)}
        />
        {googleRevogado ? (
          <a
            href="/api/google/connect"
            className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white hover:bg-amber-600"
          >
            ⚠️ O Google Agenda desconectou, a sincronização parou. Toque para
            reconectar.
          </a>
        ) : null}
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
