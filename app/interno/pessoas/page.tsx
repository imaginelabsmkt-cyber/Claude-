import { AreaHeader } from "@/components/interno/area-header";
import { Stat } from "@/components/interno/stat";
import { PessoasPanel } from "@/components/pessoas/pessoas-panel";
import { MonthNav } from "@/components/financeiro/month-nav";
import { listarPessoas } from "@/lib/data/pessoas";
import { obterPainelInterno, obterRecorteArea } from "@/lib/data/interno";
import { mesAtual, mesValido, rotuloMes } from "@/lib/financeiro/meses";
import { formatarMoeda, formatarPercentual } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { mes?: string };
}

/**
 * Pessoas: quem trabalha na agência e quanto custa.
 *
 * O cadastro é daqui (`team_members`); os valores vêm do financeiro,
 * das categorias de pró-labore e freelancers. Um número só para a
 * empresa — mudou lá, mudou aqui.
 */
export default async function PessoasPage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes) ? searchParams.mes : mesAtual();

  const [pessoas, recorte, painel] = await Promise.all([
    listarPessoas(mes),
    obterRecorteArea("pessoas", mes),
    obterPainelInterno(mes),
  ]);

  const total = recorte.realizado + recorte.pendente;
  const fatia = painel.custoFixo ? recorte.mensal / painel.custoFixo : 0;
  const ativas = pessoas.filter((p) => p.active);
  // Quanto do custo de pessoas já tem dono identificado.
  const identificado = pessoas.reduce((t, p) => t + p.noMes + p.emAberto, 0);
  const semDono = total - identificado;

  return (
    <>
      <AreaHeader
        titulo="Pessoas"
        contexto={rotuloMes(mes)}
        acao={<MonthNav mes={mes} />}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          rotulo="Custo do mês"
          valor={formatarMoeda(total)}
          origem="financeiro"
          detalhe={
            recorte.pendente > 0
              ? `${formatarMoeda(recorte.pendente)} em aberto`
              : "tudo quitado"
          }
        />
        <Stat
          rotulo="Na equipe"
          valor={String(ativas.length)}
          detalhe={`${ativas.filter((p) => p.kind === "Sócia").length} sócia(s)`}
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

      {semDono > 0.01 ? (
        <p className="mb-5 border-l-4 border-alerta bg-alerta-soft py-2 pl-3 text-sm text-gray-700">
          <strong>{formatarMoeda(semDono)}</strong> em pagamentos de pessoas neste mês
          ainda não estão ligados a ninguém. Edite o lançamento no financeiro e
          escolha a pessoa para ele aparecer aqui.
        </p>
      ) : null}

      <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
        Equipe
      </h2>
      <PessoasPanel pessoas={pessoas} />

      <p className="mt-5 border-l-4 border-area pl-3 text-sm text-gray-600">
        O cadastro é daqui, mas o dinheiro é do financeiro: cada pagamento acima é
        um lançamento nas categorias de pró-labore e freelancers. Ninguém é
        excluído — desativar preserva o histórico.
      </p>
    </>
  );
}
