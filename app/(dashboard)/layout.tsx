import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ContaBloqueada } from "@/components/layout/conta-bloqueada";
import { SessionWatcher } from "@/components/layout/session-watcher";
import { getAuthContext, displayName } from "@/lib/auth";
import { GoogleReconciler } from "@/components/layout/google-reconciler";
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

  // Autenticado não é o mesmo que autorizado: a chave pública do Supabase
  // permite criar conta, e conta nova nasce bloqueada.
  if (!ctx.approved) {
    return <ContaBloqueada email={ctx.user.email} />;
  }

  const nome = displayName(ctx);
  const role = ctx.profile?.role ?? null;
  const papel = ctx.profile ? ROLE_LABELS[ctx.profile.role] : undefined;

  return (
    <>
      <SessionWatcher />
      <GoogleReconciler />
      <AppShell nomeUsuario={nome} papelUsuario={papel} papel={role}>
        {children}
      </AppShell>
    </>
  );
}
