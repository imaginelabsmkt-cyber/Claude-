"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

interface AppShellProps {
  children: ReactNode;
  nomeUsuario?: string;
  papelUsuario?: string;
}

/**
 * Estrutura visual das páginas autenticadas: sidebar + topbar + conteúdo.
 * Gerencia o estado de abertura da sidebar no mobile.
 */
export function AppShell({
  children,
  nomeUsuario,
  papelUsuario,
}: AppShellProps) {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        aberta={menuAberto}
        aoFechar={() => setMenuAberto(false)}
        nomeUsuario={nomeUsuario}
        papelUsuario={papelUsuario}
      />

      <div className="lg:pl-64">
        <Topbar
          nomeUsuario={nomeUsuario}
          aoAbrirMenu={() => setMenuAberto(true)}
        />
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
