import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ClientsToolbar } from "@/components/clients/clients-toolbar";
import { listarClientes, type FiltroStatusCliente } from "@/lib/data/clients";
import { formatarData } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { q?: string; status?: string };
}

/** Listagem de clientes com busca e filtro de status. */
export default async function ClientesPage({ searchParams }: PageProps) {
  const status = (searchParams.status as FiltroStatusCliente) ?? "todos";
  const q = searchParams.q ?? "";
  const clientes = await listarClientes({ q, status });

  const temFiltro = Boolean(q) || status !== "todos";

  return (
    <>
      <PageHeader
        titulo="Clientes"
        descricao="Cadastro e gestão dos clientes da agência"
        acao={
          <Link href="/clientes/novo">
            <Button>Novo cliente</Button>
          </Link>
        }
      />

      <ClientsToolbar />

      {clientes.length === 0 ? (
        <EmptyState
          titulo={temFiltro ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
          descricao={
            temFiltro
              ? "Ajuste a busca ou o filtro para ver outros resultados."
              : "Cadastre o primeiro cliente para começar."
          }
          acao={
            !temFiltro ? (
              <Link href="/clientes/novo">
                <Button>Novo cliente</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Frequência</th>
                  <th className="px-4 py-3 font-medium">Conteúdos</th>
                  <th className="px-4 py-3 font-medium">Atualizado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clientes.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/clientes/${c.id}`}
                        className="flex items-center gap-2 font-medium text-gray-900 hover:text-brand-700"
                      >
                        <span
                          className="inline-block h-3 w-3 shrink-0 rounded-full border border-gray-200"
                          style={{ backgroundColor: c.color ?? "#e5e7eb" }}
                          aria-hidden="true"
                        />
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {c.active ? (
                        <Badge tom="verde">Ativo</Badge>
                      ) : (
                        <Badge tom="cinza">Inativo</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.posting_frequency ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.contentsCount}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatarData(c.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
