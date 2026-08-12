import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SessionWatcher } from "@/components/layout/session-watcher";
import { getAuthContext, displayName } from "@/lib/auth";
import { ROLE_LABELS } from "@/types";

/**
 * Layout das páginas autenticadas.
 * A proteção principal é feita pelo middleware; aqui há uma checagem extra
 * (defesa em profundidade) e a obtenção do usuário/perfil para exibição.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    redirect("/login");
  }

  const nome = displayName(ctx);
  const role = ctx.profile?.role ?? null;
  const papel = ctx.profile ? ROLE_LABELS[ctx.profile.role] : undefined;

  return (
    <>
      <SessionWatcher />
      <AppShell nomeUsuario={nome} papelUsuario={papel} papel={role}>
        {children}
      </AppShell>
    </>
  );
}
