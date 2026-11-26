import { redirect } from "next/navigation";

/**
 * O comercial abre no "Hoje".
 *
 * Abria no Funil, que é o desenho da coisa, bonito, mas não diz por
 * onde começar numa terça de manhã. No protótipo da Vitória a
 * primeira aba é "O que fazer hoje", e é a pergunta certa para quem
 * acabou de sentar.
 *
 * Quem já é cliente mora no Administrativo.
 */
export default function ComercialPage() {
  redirect("/interno/comercial/hoje");
}
