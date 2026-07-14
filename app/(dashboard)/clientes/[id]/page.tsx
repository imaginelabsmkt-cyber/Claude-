import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActiveToggle } from "@/components/clients/active-toggle";
import { obterCliente } from "@/lib/data/clients";
import { formatarData } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

/** Página individual do cliente (visão inicial). */
export default async function ClientePage({ params }: PageProps) {
  const cliente = await obterCliente(params.id);
  if (!cliente) notFound();

  return (
    <>
      <Link
        href="/clientes"
        className="mb-4 inline-block text-sm text-brand-700 hover:underline"
      >
        ← Voltar para clientes
      </Link>

      <PageHeader
        titulo={cliente.name}
        descricao={`Atualizado em ${formatarData(cliente.updated_at)}`}
        acao={
          <div className="flex items-center gap-2">
            <Link href={`/clientes/${cliente.id}/editar`}>
              <Button variante="secundaria">Editar</Button>
            </Link>
            <ActiveToggle id={cliente.id} ativo={cliente.active} />
          </div>
        }
      />

      {/* Dados do cliente */}
      <Card>
        <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Status
            </p>
            <div className="mt-1">
              {cliente.active ? (
                <Badge tom="verde">Ativo</Badge>
              ) : (
                <Badge tom="cinza">Inativo</Badge>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Cor</p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="inline-block h-4 w-4 rounded-full border border-gray-200"
                style={{ backgroundColor: cliente.color ?? "#e5e7eb" }}
                aria-hidden="true"
              />
              <span className="text-sm text-gray-700">
                {cliente.color ?? "—"}
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Frequência de postagem
            </p>
            <p className="mt-1 text-sm text-gray-700">
              {cliente.posting_frequency ?? "—"}
            </p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Observações
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
              {cliente.notes ?? "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Espaço reservado para indicadores futuros */}
      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Indicadores</h2>
        <Card>
          <CardContent>
            <p className="text-sm text-gray-500">
              Os indicadores de produção deste cliente serão exibidos aqui.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Espaço reservado para a lista de conteúdos */}
      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Conteúdos</h2>
        <Card>
          <CardContent>
            <p className="text-sm text-gray-500">
              A lista de conteúdos deste cliente será exibida aqui.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
