import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ClientForm } from "@/components/clients/client-form";
import { obterCliente } from "@/lib/data/clients";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

/** Página de edição de cliente. */
export default async function EditarClientePage({ params }: PageProps) {
  const cliente = await obterCliente(params.id);
  if (!cliente) notFound();

  return (
    <>
      <PageHeader titulo="Editar cliente" descricao={cliente.name} />
      <Link
        href={`/clientes/${cliente.id}`}
        className="mb-4 inline-block text-sm text-brand-700 hover:underline"
      >
        ← Voltar para o cliente
      </Link>
      <Card>
        <CardContent>
          <ClientForm cliente={cliente} />
        </CardContent>
      </Card>
    </>
  );
}
