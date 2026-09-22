import Link from "next/link";
import { AreaHeader } from "@/components/interno/area-header";
import { Stat } from "@/components/interno/stat";
import { OrigemItem, OrigemLista } from "@/components/interno/origem-item";
import { MonthNav } from "@/components/financeiro/month-nav";
import { obterPainelInterno } from "@/lib/data/interno";
import { mesAtual, mesValido, rotuloMes } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { mes?: string };
}

/**
 * Início do sistema interno: o cruzamento.
 *
 * É a única tela que mistura as áreas de propósito — e por isso cada
 * linha carrega a cor e a etiqueta de onde veio.
 */
export default async function InternoInicioPage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes) ? searchParams.mes : mesAtual();

  const painel = await obterPainelInterno(mes);
  const { financeiro, carteira, custoFixo } = painel;
  const sobra = carteira.recorrente - custoFixo;

  return (
    <>
      <AreaHeader
        titulo="Início"
        contexto={rotuloMes(mes)}
        acao={<MonthNav mes={mes} />}
      />

      {sobra < 0 ? (
        <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border border-alerta bg-alerta-soft px-4 py-3.5">
          <span className="text-2xl font-bold tabular-nums text-alerta">
            {formatarMoeda(sobra)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">
              O fixo do mês ainda não se paga sozinho
            </p>
            <p className="text-xs text-gray-600">
              {carteira.ativos} mensalidades somam {formatarMoeda(carteira.recorrente)} e o
              custo fixo é {formatarMoeda(custoFixo)}.
            </p>
          </div>
          <Link
            href="/interno/comercial"
            className="rounded-lg bg-alerta px-3 py-2 text-sm font-semibold text-white"
          >
            Ver a carteira
          </Link>
        </div>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          rotulo="Em caixa"
          valor={formatarMoeda(financeiro.resumo.saldoInicial)}
          origem="financeiro"
          detalhe="No início do mês"
        />
        <Stat
          rotulo="A receber"
          valor={formatarMoeda(financeiro.resumo.aReceber)}
          origem="financeiro"
          detalhe={`${financeiro.aReceber.length} em aberto`}
        />
        <Stat
          rotulo="A pagar"
          valor={formatarMoeda(financeiro.resumo.aPagar)}
          origem="financeiro"
          detalhe={`${financeiro.aPagar.length} em aberto`}
        />
        <Stat
          rotulo="Clientes ativos"
          valor={String(carteira.ativos)}
          origem="comercial"
          detalhe={`${formatarMoeda(carteira.recorrente)} por mês`}
        />
      </div>

      <div className="mb-2 flex items-baseline gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
          Com prazo
        </h2>
        {painel.urgentes > 0 ? (
          <span className="text-xs font-semibold text-alerta">
            {painel.urgentes} vencendo ou vencido
          </span>
        ) : null}
      </div>

      {painel.compromissos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <p className="font-medium text-gray-900">Nada em aberto em {rotuloMes(mes)}</p>
          <p className="mt-1 text-sm text-gray-500">
            Tudo que tinha prazo neste mês já foi baixado.
          </p>
        </div>
      ) : (
        <OrigemLista>
          {painel.compromissos.slice(0, 12).map((c) => (
            <OrigemItem
              key={c.id}
              origem={c.origem}
              titulo={c.titulo}
              descricao={c.descricao}
              valor={c.valor > 0 ? formatarMoeda(c.valor) : undefined}
              prazo={c.prazo}
              atrasado={c.atrasado}
            />
          ))}
        </OrigemLista>
      )}

      {painel.compromissos.length > 12 ? (
        <Link
          href={`/interno/financeiro/lancamentos?mes=${mes}&status=Pendente`}
          className="mt-3 inline-block text-sm font-medium text-gray-600 hover:underline"
        >
          Ver todos os {painel.compromissos.length} em aberto
        </Link>
      ) : null}
    </>
  );
}
