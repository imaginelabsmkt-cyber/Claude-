import { AreaHeader } from "@/components/interno/area-header";
import { FinanceTabs } from "@/components/financeiro/finance-tabs";
import { SettingsPanel } from "@/components/financeiro/settings-panel";
import { listarCategorias, obterConfiguracaoFinanceira } from "@/lib/data/financeiro";

export const dynamic = "force-dynamic";

export const metadata = { title: "Configuração" };

/** Configuração do financeiro: saldo inicial e categorias. */
export default async function CategoriasFinanceiroPage() {
  const [configuracao, categorias] = await Promise.all([
    obterConfiguracaoFinanceira(),
    listarCategorias(),
  ]);

  return (
    <>
      <AreaHeader titulo="Configuração" />

      <FinanceTabs />

      <SettingsPanel configuracao={configuracao} categorias={categorias} />
    </>
  );
}
