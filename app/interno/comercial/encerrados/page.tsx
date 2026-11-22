import { redirect } from "next/navigation";

/**
 * "Encerradas" deixou de ser uma tela.
 *
 * O que ela mostrava se dividiu em dois lugares melhores: quem já
 * passou pelo comercial agora está em "Leads e clientes", junto com
 * quem ainda está em jogo; e "Por que não fechou" foi para o Painel
 * de canais, ao lado das outras contas.
 *
 * O endereço continua respondendo porque pode estar salvo no
 * navegador de alguma das duas.
 */
export default function EncerradosPage() {
  redirect("/interno/comercial/leads");
}
