import { redirect } from "next/navigation";

/**
 * "Relatórios" deixou de ser aba.
 *
 * Era uma tela com quatro links dentro, disputando espaço no topo com
 * as três que a Fran e a Vitória abrem todo dia. Virou uma seção do
 * Resumo, que é onde se olha o ano.
 *
 * O endereço continua respondendo porque pode estar salvo no
 * navegador de alguma das duas.
 */
export default function RelatoriosPage() {
  redirect("/interno/financeiro/resumo-anual");
}
