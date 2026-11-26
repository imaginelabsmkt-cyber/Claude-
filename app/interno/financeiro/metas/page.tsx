import { redirect } from "next/navigation";

/**
 * Metas saiu do Financeiro e virou área própria.
 *
 * A Fran: "eu acho que dentro do financeiro fica muito escondido. E a
 * gente tem que estar vendo aquilo ali todo dia."
 *
 * O endereço continua respondendo porque pode estar salvo no
 * navegador de alguma das duas.
 */
export default function MetasNoFinanceiroPage() {
  redirect("/interno/metas");
}
