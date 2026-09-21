import { redirect } from "next/navigation";

/**
 * Importar planejamento agora vive na aba Planejamentos (cada coisa no seu
 * lugar). Mantém esta rota antiga funcionando via redirecionamento.
 */
export default function ImportarPlanejamentoLegado() {
  redirect("/planejamentos/importar");
}
