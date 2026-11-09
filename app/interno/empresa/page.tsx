import { redirect } from "next/navigation";

/** A Empresa abre pela equipe, que é a aba mais consultada das três. */
export default function EmpresaPage() {
  redirect("/interno/empresa/equipe");
}
