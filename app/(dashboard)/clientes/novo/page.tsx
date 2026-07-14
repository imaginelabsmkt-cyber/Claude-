import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ClientForm } from "@/components/clients/client-form";

/** Página de criação de cliente. */
export default function NovoClientePage() {
  return (
    <>
      <PageHeader
        titulo="Novo cliente"
        descricao="Cadastre um novo cliente da agência"
      />
      <Link
        href="/clientes"
        className="mb-4 inline-block text-sm text-brand-700 hover:underline"
      >
        ← Voltar para clientes
      </Link>
      <Card>
        <CardContent>
          <ClientForm />
        </CardContent>
      </Card>
    </>
  );
}
