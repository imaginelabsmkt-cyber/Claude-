import { AreaHeader } from "@/components/interno/area-header";
import { Stat } from "@/components/interno/stat";
import { RecorteLista } from "@/components/interno/recorte-lista";
import { MonthNav } from "@/components/financeiro/month-nav";
import { obterPainelInterno, obterRecorteArea } from "@/lib/data/interno";
import { mesAtual, mesValido, rotuloMes } from "@/lib/financeiro/meses";
import { formatarMoeda, formatarPercentual } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { mes?: string };
}

/**
 * Pessoas: o que a equipe custa.
 *
 * Não tem tabela própria — é o recorte das categorias de pró-labore e
 * freelancers sobre o financeiro. Um número só para a empresa.
 */
export default async function PessoasPage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes) ? searchParams.mes : mesAtual();

  const [recorte, painel] = await Promise.all([
    obterRecorteArea("pessoas", mes),
    obterPainelInterno(mes),
  ]);

  const total = recorte.realizado + recorte.pendente;
  const fatia = painel.custoFixo ? recorte.mensal / painel.custoFixo : 0;

  return (
    <>
      <AreaHeader
        titulo="Pessoas"
        contexto={rotuloMes(mes)}
        acao={<MonthNav mes={mes} />}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat rotulo="Custo do mês" valor={formatarMoeda(total)} />
        <Stat
          rotulo="Já pago"
          valor={formatarMoeda(recorte.realizado)}
          detalhe={recorte.pendente > 0 ? `${formatarMoeda(recorte.pendente)} em aberto` : "tudo quitado"}
        />
        <Stat
          rotulo="Fixo por mês"
          valor={formatarMoeda(recorte.mensal)}
          detalhe="Pró-labore recorrente"
        />
        <Stat
          rotulo="Do custo fixo"
          valor={formatarPercentual(fatia)}
          detalhe={`de ${formatarMoeda(painel.custoFixo)}`}
        />
      </div>

      <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
        Quem recebe em {rotuloMes(mes)}
      </h2>
      <RecorteLista
        lancamentos={recorte.lancamentos}
        vazio="Nenhum pagamento de pessoas lançado neste mês."
      />

      <p className="mt-4 border-l-4 border-area pl-3 text-sm text-gray-600">
        Estes lançamentos vivem no financeiro, nas categorias de pró-labore e
        freelancers. Alterar aqui ou lá dá no mesmo — é o mesmo dado.
      </p>
    </>
  );
}
