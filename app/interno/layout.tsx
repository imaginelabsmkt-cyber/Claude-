import { redirect } from "next/navigation";
import { ContaBloqueada } from "@/components/layout/conta-bloqueada";
import { InternoShell } from "@/components/interno/interno-shell";
import { SessionWatcher } from "@/components/layout/session-watcher";
import { getAuthContext, displayName } from "@/lib/auth";

/**
 * Layout do sistema interno (administração da empresa).
 * Separado do sistema de gestão de demandas: outro menu, outra cara,
 * mesmo login e mesmo banco.
 */
export default async function InternoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAuthContext();
  if (!ctx.user) redirect("/login");
  if (!ctx.approved) return <ContaBloqueada email={ctx.user.email} />;

  return (
    <>
      <SessionWatcher />
      <InternoShell nomeUsuario={displayName(ctx)}>{children}</InternoShell>
    </>
  );
}
