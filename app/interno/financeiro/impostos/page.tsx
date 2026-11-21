import { AreaHeader } from "@/components/interno/area-header";
import { FinanceTabs } from "@/components/financeiro/finance-tabs";
import { Secao } from "@/components/interno/secao";
import { Stat } from "@/components/interno/stat";
import { RecorteLista } from "@/components/interno/recorte-lista";
import { ObrigacoesPanel } from "@/components/empresa/obrigacoes-panel";
import { MonthNav } from "@/components/financeiro/month-nav";
import { obterRecorteArea } from "@/lib/data/interno";
import { listarObrigacoes } from "@/lib/data/empresa";
import { mesAtual, mesValido, rotuloMes } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Impostos" };

interface PageProps {
  searchParams: { mes?: string };
}

/**
 * Impostos e contábil: o que tem prazo com o governo e com o
 * escritório de contabilidade.
 *
 * Não tem tabela própria: é um recorte das categorias de DAS e
 * contabilidade sobre os lançamentos, mais as obrigações que têm prazo
 * e NÃO são despesa (entregar documento, renovar certidão).
 */
export default async function ContabilPage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes) ? searchParams.mes : mesAtual();

  const [recorte, obrigacoes] = await Promise.all([
    obterRecorteArea("prazos", mes),
    listarObrigacoes("contabil"),
  ]);
  const atrasadas = obrigacoes.filter((o) => o.aberto?.situacao === "Atrasada").length;
  const emAberto = recorte.lancamentos.filter((l) => l.status === "Pendente");

  return (
    <>
      <AreaHeader
        titulo="Tributos e obrigações"
        acao={<MonthNav mes={mes} />}
      />

      <FinanceTabs />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Stat
          rotulo="Total de tributos"
          valor={formatarMoeda(recorte.realizado + recorte.pendente)}
          detalhe={rotuloMes(mes)}
        />
        <Stat
          rotulo="Em aberto"
          valor={formatarMoeda(recorte.pendente)}
          alerta={recorte.pendente > 0}
          detalhe={
            emAberto.length === 1
              ? "1 lançamento em aberto"
              : `${emAberto.length} lançamentos em aberto`
          }
        />
      </div>

      <Secao
        titulo="Tributos e honorários"
      >
        <RecorteLista
          lancamentos={recorte.lancamentos}
          vazio="Nenhum imposto ou honorário lançado neste mês."
        />
      </Secao>

      <Secao
        titulo="Obrigações acessórias"
      >
        <ObrigacoesPanel obrigacoes={obrigacoes} area="contabil" />
      </Secao>
    </>
  );
}
