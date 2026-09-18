import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { listarClientes } from "@/lib/data/clients";

export const dynamic = "force-dynamic";

/**
 * "Nosso conteúdo": o conteúdo da própria favie. Reaproveita todo o motor de
 * produção (planejamento, roteiro, gravações, artes, postagens, calendário) —
 * cada espaço interno é um "cliente" marcado como interno, aberto pela ficha.
 */
export default async function NossoConteudoPage() {
  const internos = await listarClientes({ apenasInternos: true });

  return (
    <>
      <PageHeader
        titulo="Nosso conteúdo"
        descricao="A produção da própria favie — separada dos clientes"
        icone="quadro"
        tom="verde"
        acao={
          <Link href="/clientes/novo?interno=1">
            <Button>+ Novo espaço</Button>
          </Link>
        }
      />

      {internos.length === 0 ? (
        <EmptyState
          titulo="Ainda não tem conteúdo interno"
          descricao="Crie um espaço para a favie (ex.: 'favie — Instagram'). Ele usa tudo que você já conhece: planejamento, roteiro, gravações, artes, postagens e calendário — só que pra vocês."
          acao={
            <Link href="/clientes/novo?interno=1">
              <Button>Criar nosso conteúdo</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {internos.map((c) => (
            <Link
              key={c.id}
              href={`/clientes/${c.id}`}
              className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50/40"
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-gray-200"
                  style={{ backgroundColor: c.color ?? "#6a2336" }}
                  aria-hidden="true"
                />
                <span className="font-semibold text-gray-900">{c.name}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                <span>{c.contentsCount} conteúdos</span>
                {c.niche ? <span>{c.niche}</span> : null}
              </div>
              <p className="mt-3 text-xs font-medium text-brand-700">
                Abrir painel →
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
