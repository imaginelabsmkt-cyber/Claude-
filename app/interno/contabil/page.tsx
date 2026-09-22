import { AreaHeader } from "@/components/interno/area-header";
import { Stat } from "@/components/interno/stat";
import { RecorteLista } from "@/components/interno/recorte-lista";
import { ObrigacoesPanel } from "@/components/empresa/obrigacoes-panel";
import { MonthNav } from "@/components/financeiro/month-nav";
import { obterRecorteArea } from "@/lib/data/interno";
import { listarObrigacoes } from "@/lib/data/empresa";
import { mesAtual, mesValido, rotuloMes } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { mes?: string };
}

/**
 * Contábil e fiscal: o que tem prazo com o governo e com o escritório.
 * Recorte das categorias de DAS e contabilidade sobre o financeiro.
 */
export default async function ContabilPage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes) ? searchParams.mes : mesAtual();

  const [recorte, obrigacoes] = await Promise.all([
    obterRecorteArea("contabil", mes),
    listarObrigacoes("contabil"),
  ]);
  const atrasadas = obrigacoes.filter((o) => o.aberto?.situacao === "Atrasada").length;
  const emAberto = recorte.lancamentos.filter((l) => l.status === "Pendente");

  return (
    <>
      <AreaHeader
        titulo="Contábil e fiscal"
        contexto={rotuloMes(mes)}
        acao={<MonthNav mes={mes} />}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          rotulo="Do mês"
          valor={formatarMoeda(recorte.realizado + recorte.pendente)}
        />
        <Stat
          rotulo="Em aberto"
          valor={formatarMoeda(recorte.pendente)}
          alerta={recorte.pendente > 0}
          detalhe={`${emAberto.length} obrigação(ões)`}
        />
        <Stat rotulo="Fixo por mês" valor={formatarMoeda(recorte.mensal)} />
        <Stat
          rotulo="Prazos cadastrados"
          valor={String(obrigacoes.length)}
          alerta={atrasadas > 0}
          detalhe={atrasadas > 0 ? `${atrasadas} atrasada(s)` : "nenhuma atrasada"}
        />
      </div>

      <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
        Obrigações de {rotuloMes(mes)}
      </h2>
      <RecorteLista
        lancamentos={recorte.lancamentos}
        vazio="Nenhuma obrigação lançada neste mês."
      />

      <p className="mt-4 border-l-4 border-area pl-3 text-sm text-gray-600">
        DAS e honorários da contabilidade são recorrências do financeiro: uma vez
        cadastrados, aparecem todo mês sem ninguém precisar lembrar.
      </p>

      <h2 className="mb-2 mt-7 text-[11px] font-bold uppercase tracking-wider text-gray-500">
        Prazos que não são despesa
      </h2>
      <ObrigacoesPanel obrigacoes={obrigacoes} area="contabil" />
    </>
  );
}
