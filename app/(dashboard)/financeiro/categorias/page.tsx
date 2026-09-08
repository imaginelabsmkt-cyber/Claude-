import { PageHeader } from "@/components/layout/page-header";
import { FinanceTabs } from "@/components/financeiro/finance-tabs";
import { SettingsPanel } from "@/components/financeiro/settings-panel";
import { listarCategorias, obterConfiguracaoFinanceira } from "@/lib/data/financeiro";

export const dynamic = "force-dynamic";

/** Configuração do financeiro: saldo inicial e categorias. */
export default async function CategoriasFinanceiroPage() {
  const [configuracao, categorias] = await Promise.all([
    obterConfiguracaoFinanceira(),
    listarCategorias(),
  ]);

  return (
    <>
      <PageHeader
        titulo="Categorias e saldo inicial"
        descricao="Como o dinheiro é classificado e de onde a série começa"
        icone="financeiro"
        tom="verde"
      />

      <FinanceTabs />

      <SettingsPanel configuracao={configuracao} categorias={categorias} />
    </>
  );
}
