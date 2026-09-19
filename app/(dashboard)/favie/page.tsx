import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ClientSectionTabs } from "@/components/clients/client-section-tabs";
import { ClientContentsByMonth } from "@/components/clients/client-contents-by-month";
import { IdeasBoard } from "@/components/favie/ideas-board";
import { garantirClienteFavie } from "@/lib/data/clients";
import { listarIdeias } from "@/lib/data/ideas";
import { listContents, listProfiles } from "@/lib/data/contents";

export const dynamic = "force-dynamic";

/**
 * Espaço da favie: o conteúdo próprio da agência. Duas portas ·
 * 💡 Ideias (captura rápida, nasce com formato e pilar) e 📋 Produção (o
 * mesmo fluxo dos clientes). Fica separado dos clientes e fora das métricas.
 */
export default async function FaviePage() {
  const favie = await garantirClienteFavie();

  if (!favie) {
    return (
      <>
        <PageHeader titulo="favie" descricao="Nosso conteúdo" icone="quadro" />
        <EmptyState
          titulo="Não foi possível abrir o espaço da favie"
          descricao="Rode a migração do banco (content_ideas + is_internal) e recarregue."
        />
      </>
    );
  }

  const [ideias, contents, perfis] = await Promise.all([
    listarIdeias(favie.id),
    listContents(
      { client_id: favie.id },
      { incluirClientesInativos: true, excluirCapas: true },
    ),
    listProfiles(),
  ]);

  const clienteOpt = [{ id: favie.id, name: favie.name, color: favie.color }];

  return (
    <>
      <PageHeader
        titulo="favie"
        descricao="Ideias e produção da própria favie"
        icone="quadro"
        tom="verde"
      />

      <ClientSectionTabs
        padrao="ideias"
        abas={[
          {
            id: "ideias",
            label: "Ideias",
            icone: "sparkles",
            badge: ideias.length,
            conteudo: (
              <div>
                <p className="mb-3 text-[11px] text-gray-400">
                  Jogue a ideia assim que surgir (nasce com formato e pilar).
                  Quando decidir fazer, clique em “Produzir” e ela entra no
                  fluxo normal.
                </p>
                <IdeasBoard clientId={favie.id} ideias={ideias} />
              </div>
            ),
          },
          {
            id: "producao",
            label: "Produção",
            icone: "list",
            badge: contents.length,
            conteudo: (
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-gray-400">
                    O conteúdo da favie que já está em produção. Funciona igual
                    aos clientes: edite na linha, clique para abrir.
                  </span>
                  <Link href="/conteudos/importar">
                    <Button variante="secundaria">Importar planejamento</Button>
                  </Link>
                </div>
                <ClientContentsByMonth
                  contents={contents}
                  clientes={clienteOpt}
                  perfis={perfis}
                  vazioDescricao="Nada em produção ainda. Traga uma ideia da aba Ideias ou importe um planejamento."
                  acaoVazio={
                    <div className="flex flex-wrap justify-center gap-2">
                      <Link href="/conteudos/importar">
                        <Button variante="secundaria">
                          Importar planejamento
                        </Button>
                      </Link>
                      <Link href="/conteudos/novo">
                        <Button>+ Novo conteúdo</Button>
                      </Link>
                    </div>
                  }
                />
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
