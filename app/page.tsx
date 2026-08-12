import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { rotaInicial } from "@/lib/navigation";

/**
 * Rota raiz. Sem sessão vai para o login; com sessão encaminha para a tela
 * inicial do papel (produção → tarefas, planejamento → conteúdos, admin →
 * dashboard).
 */
export default async function HomePage() {
  const ctx = await getAuthContext();
  if (!ctx.user) redirect("/login");
  redirect(rotaInicial(ctx.profile?.role ?? null));
}
