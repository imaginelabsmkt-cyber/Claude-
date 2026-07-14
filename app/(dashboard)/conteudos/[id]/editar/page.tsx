import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ContentForm } from "@/components/contents/content-form";
import {
  getContent,
  listClientOptions,
  listProfiles,
} from "@/lib/data/contents";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

/** Página de edição de conteúdo. */
export default async function EditarConteudoPage({ params }: PageProps) {
  const [conteudo, clientes, perfis] = await Promise.all([
    getContent(params.id),
    listClientOptions(),
    listProfiles(),
  ]);
  if (!conteudo) notFound();

  return (
    <>
      <PageHeader titulo="Editar conteúdo" descricao={conteudo.title} />
      <Link
        href={`/conteudos/${conteudo.id}`}
        className="mb-4 inline-block text-sm text-brand-700 hover:underline"
      >
        ← Voltar para o conteúdo
      </Link>
      <Card>
        <CardContent>
          <ContentForm conteudo={conteudo} clientes={clientes} perfis={perfis} />
        </CardContent>
      </Card>
    </>
  );
}
