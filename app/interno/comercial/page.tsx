import { redirect } from "next/navigation";

/** O Comercial é o funil. A carteira de quem já é cliente fica no Administrativo. */
export default function ComercialPage() {
  redirect("/interno/comercial/funil");
}
