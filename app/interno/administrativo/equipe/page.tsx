import { AreaHeader } from "@/components/interno/area-header";
import { AdministrativoTabs } from "@/components/interno/administrativo-tabs";
import { Secao } from "@/components/interno/secao";
import { Stat } from "@/components/interno/stat";
import { PessoasPanel } from "@/components/pessoas/pessoas-panel";
import { MonthNav } from "@/components/financeiro/month-nav";
import { listarPessoas } from "@/lib/data/pessoas";
import { obterRecorteArea } from "@/lib/data/interno";
import { mesAtual, mesValido } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Equipe" };

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

  const [pessoas, recorte] = await Promise.all([
    listarPessoas(mes),
    obterRecorteArea("equipe", mes),
  ]);

  const total = recorte.realizado + recorte.pendente;
  const ativas = pessoas.filter((p) => p.active);
  // Quanto do custo de pessoas já tem dono identificado.
  const identificado = pessoas.reduce((t, p) => t + p.noMes + p.emAberto, 0);
  const semDono = total - identificado;

  return (
    <>
      <AreaHeader
        contexto="Quem trabalha na agência e quanto custa"
        acao={<MonthNav mes={mes} />}
      />

      <AdministrativoTabs />

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <Stat
          rotulo="Custo com pessoas"
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
          detalhe={(() => {
            const socias = ativas.filter((p) => p.kind === "Sócia").length;
            return socias === 1 ? "1 sócia" : `${socias} sócias`;
          })()}
        />
      </div>

      {semDono > 0.01 ? (
        <p className="mb-5 border-l-4 border-alerta bg-alerta-soft py-2 pl-3 text-sm text-gray-700">
          <strong>{formatarMoeda(semDono)}</strong> em pagamentos de pessoas neste mês
          ainda não estão ligados a ninguém. Edite o lançamento no financeiro e
          escolha a pessoa para ele aparecer aqui.
        </p>
      ) : null}

      <Secao
        titulo="Quem é da casa"
      >
        <PessoasPanel pessoas={pessoas} />
      </Secao>
    </>
  );
}
