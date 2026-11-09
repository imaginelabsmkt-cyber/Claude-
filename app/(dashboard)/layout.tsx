import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SessionWatcher } from "@/components/layout/session-watcher";
import { getAuthContext, displayName } from "@/lib/auth";
import { GoogleReconciler } from "@/components/layout/google-reconciler";
import { obterConexaoGoogle, obterConexaoAgencia } from "@/lib/data/google";
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
  const [google, agencia] = await Promise.all([
    obterConexaoGoogle(ctx.user.id),
    obterConexaoAgencia(),
  ]);
  // Mostra o aviso quando a conexão que sincroniza (a da agência) caiu, pra
  // qualquer pessoa da equipe, não só quem conectou.
  const googleRevogado = agencia.revogado || google.revogado;

  return (
    <>
      <SessionWatcher />
      <GoogleReconciler />
      <AppShell
        nomeUsuario={nome}
        papelUsuario={papel}
        papel={role}
        googleRevogado={googleRevogado}
      >
        {children}
      </AppShell>
    </>
  );
}
