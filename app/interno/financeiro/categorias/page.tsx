import { AreaHeader } from "@/components/interno/area-header";
import { FinanceTabs } from "@/components/financeiro/finance-tabs";
import { SettingsPanel } from "@/components/financeiro/settings-panel";
import { Somadora } from "@/components/financeiro/somadora";
import { Secao } from "@/components/interno/secao";
import { listarCategorias, obterConfiguracaoFinanceira } from "@/lib/data/financeiro";

export const dynamic = "force-dynamic";

export const metadata = { title: "Configuração" };

/**
 * Configuração do financeiro: saldo inicial, categorias e a
 * calculadora.
 *
 * A calculadora veio da barra de ações do mês, onde ficava ao lado de
 * "Lançar" com o mesmo peso. Ela é útil — "preciso somar o pró-labore
 * da Vitória, a mentoria e o iCloud dela" —, mas é útil uma vez por
 * semana, não o dia inteiro. Aqui ela está a um clique e não disputa
 * atenção com o que se faz todo dia.
 */
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

      <div className="mt-6">
        <Secao titulo="Calculadora">
          <Somadora />
        </Secao>
      </div>
    </>
  );
}
