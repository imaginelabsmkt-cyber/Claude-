import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { ContentForm } from "@/components/contents/content-form";
import { listClientOptions, listProfiles } from "@/lib/data/contents";

export const dynamic = "force-dynamic";

/** Página de criação de conteúdo. */
export default async function NovoConteudoPage() {
  const [clientes, perfis] = await Promise.all([
    listClientOptions(),
    listProfiles(),
  ]);

  return (
    <>
      <PageHeader
        titulo="Novo conteúdo"
        descricao="Cadastro rápido. Os detalhes de gravação e edição você preenche na etapa certa."
      />
      <Link
        href="/conteudos"
        className="mb-4 inline-block text-sm text-brand-700 hover:underline"
      >
        ← Voltar para conteúdos
      </Link>

      {clientes.length === 0 ? (
        <EmptyState
          titulo="Cadastre um cliente primeiro"
          descricao="É necessário ter ao menos um cliente ativo para criar conteúdos."
          acao={
            <Link href="/clientes/novo">
              <Button>Novo cliente</Button>
            </Link>
          }
        />
      ) : (
        <Card>
          <CardContent>
            <ContentForm clientes={clientes} perfis={perfis} compacto />
          </CardContent>
        </Card>
      )}
    </>
  );
}
