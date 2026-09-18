import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ClientForm } from "@/components/clients/client-form";

/** Página de criação de cliente. */
export default function NovoClientePage({
  searchParams,
}: {
  searchParams: { interno?: string };
}) {
  const interno = searchParams.interno === "1";
  return (
    <>
      <PageHeader
        titulo={interno ? "Novo conteúdo interno" : "Novo cliente"}
        descricao={
          interno
            ? "Um espaço para o conteúdo da própria favie"
            : "Cadastre um novo cliente da agência"
        }
      />
      <Link
        href={interno ? "/nosso-conteudo" : "/clientes"}
        className="mb-4 inline-block text-sm text-brand-700 hover:underline"
      >
        ← Voltar
      </Link>
      <Card>
        <CardContent>
          <ClientForm internoInicial={interno} />
        </CardContent>
      </Card>
    </>
  );
}
