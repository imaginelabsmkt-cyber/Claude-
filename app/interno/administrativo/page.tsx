import { AreaHeader } from "@/components/interno/area-header";
import { Stat } from "@/components/interno/stat";
import { RecorteLista } from "@/components/interno/recorte-lista";
import { MonthNav } from "@/components/financeiro/month-nav";
import { obterRecorteArea } from "@/lib/data/interno";
import { mesAtual, mesValido, rotuloMes } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { mes?: string };
}

/**
 * Administrativo: o que a empresa assina e paga todo mês.
 * Recorte das ferramentas e equipamentos sobre o financeiro.
 */
export default async function AdministrativoPage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes) ? searchParams.mes : mesAtual();

  const recorte = await obterRecorteArea("administrativo", mes);

  // As assinaturas são o grosso: vale ver por ferramenta, do maior ao menor.
  const porFerramenta = [...recorte.lancamentos].sort(
    (a, b) => Number(b.amount) - Number(a.amount),
  );

  return (
    <>
      <AreaHeader
        titulo="Administrativo"
        contexto={rotuloMes(mes)}
        acao={<MonthNav mes={mes} />}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          rotulo="Do mês"
          valor={formatarMoeda(recorte.realizado + recorte.pendente)}
        />
        <Stat
          rotulo="Ferramentas fixas"
          valor={formatarMoeda(recorte.mensal)}
          detalhe="Assinaturas recorrentes"
        />
        <Stat rotulo="Itens no mês" valor={String(recorte.lancamentos.length)} />
        <Stat
          rotulo="Pago no ano"
          valor={formatarMoeda(recorte.noAno)}
          detalhe={`Em ${mes.slice(0, 4)}`}
        />
      </div>

      <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
        Assinaturas e equipamentos, do mais caro ao mais barato
      </h2>
      <RecorteLista
        lancamentos={porFerramenta}
        vazio="Nenhuma assinatura ou equipamento lançado neste mês."
      />

      <p className="mt-4 border-l-4 border-area pl-3 text-sm text-gray-600">
        Contratos e documentos da empresa entram aqui na próxima etapa — por
        enquanto esta tela mostra o que já existe no financeiro.
      </p>
    </>
  );
}
