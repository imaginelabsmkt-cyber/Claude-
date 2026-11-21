import { redirect } from "next/navigation";
import { ContaBloqueada } from "@/components/layout/conta-bloqueada";
import { InternoShell } from "@/components/interno/interno-shell";
import { SessionWatcher } from "@/components/layout/session-watcher";
import { getAuthContext, displayName } from "@/lib/auth";
import { contarClientesAtivos } from "@/lib/data/interno";

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

  // O quantitativo de clientes fica na barra do topo, que é a única
  // coisa que está em TODA tela do interno — foi o pedido: "não sei se
  // no administrativo, no financeiro, mas eu quero que sempre apareça".
  const clientesAtivos = await contarClientesAtivos();

  return (
    <>
      <SessionWatcher />
      <InternoShell
        nomeUsuario={displayName(ctx)}
        clientesAtivos={clientesAtivos}
      >
        {children}
      </InternoShell>
    </>
  );
}
