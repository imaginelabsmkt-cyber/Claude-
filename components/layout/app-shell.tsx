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
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
