import { redirect } from "next/navigation";

/** O Administrativo abre pelos clientes, que é o que mais se consulta. */
export default function AdministrativoPage() {
  redirect("/interno/administrativo/clientes");
}
