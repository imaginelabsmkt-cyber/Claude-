import { AppShell } from "@/components/layout/app-shell";

/**
 * Layout das páginas autenticadas.
 * A proteção de rota é feita pelo middleware. A obtenção do usuário
 * logado (nome/papel) via Supabase será adicionada na etapa de auth.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell nomeUsuario="Usuário">{children}</AppShell>;
}
