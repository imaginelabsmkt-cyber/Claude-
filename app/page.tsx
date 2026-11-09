import { redirect } from "next/navigation";
import { ContaBloqueada } from "@/components/layout/conta-bloqueada";
import { getAuthContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Raiz do sistema interno.
 *
 * Aqui já existiu uma "porta de entrada" com dois cartões, Demandas e
 * Interno, de quando os dois sistemas moravam no mesmo lugar. Eles não
 * moram mais: este projeto é SÓ a administração da empresa, e a gestão
 * de conteúdo e demandas é um sistema à parte, com a própria base e os
 * próprios dados.
 *
 * Então não há o que escolher — entrou, está no Interno.
 */
export default async function RaizPage() {
  const ctx = await getAuthContext();
  if (!ctx.user) redirect("/login");
  if (!ctx.approved) return <ContaBloqueada email={ctx.user.email} />;

  redirect("/interno");
}
