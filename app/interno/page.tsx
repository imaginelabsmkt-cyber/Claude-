import Link from "next/link";
import { AreaHeader } from "@/components/interno/area-header";
import { GraficoAno } from "@/components/interno/grafico-ano";
import { GraficoCaixa } from "@/components/interno/grafico-caixa";
import { OrigemItem, OrigemLista } from "@/components/interno/origem-item";
import { Secao } from "@/components/interno/secao";
import { MonthNav } from "@/components/financeiro/month-nav";
import { obterPainelInterno } from "@/lib/data/interno";
import {
  mesAtual,
  mesValido,
  mesesDoAno,
  rotuloMes,
  rotuloMesCurto,
} from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Início" };

interface PageProps {
  searchParams: { mes?: string };
}

/** Um número do painel, com link para a tela que o explica. */
function Indicador({
  rotulo,
  valor,
  detalhe,
  href,
  alerta,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  href: string;
  alerta?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        "block rounded-2xl border bg-white px-4 py-3 shadow-sm transition-colors hover:bg-gray-50 " +
        (alerta ? "border-alerta" : "border-gray-200")
      }
    >
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-500">
        {rotulo}
      </p>
      <p
        className={
          "mt-0.5 text-xl font-bold tabular-nums " +
          (alerta ? "text-alerta" : "text-gray-900")
        }
      >
        {valor}
      </p>
      {detalhe ? (
        <p className="mt-0.5 text-xs text-gray-500">{detalhe}</p>
      ) : null}
    </Link>
  );
}

/**
 * Início: o painel do sistema inteiro, não só do financeiro.
 *
 * A ordem é a que a Fran pediu: o faturamento do ano primeiro, porque
 * é o número que ela quer ver ao abrir; depois a linha de indicadores
 * que as três etapas alimentam (dinheiro, comercial, administrativo);
 * depois o que pede ação, misturado, com a cor da área de origem.
 *
 * Os indicadores seguem o que os painéis de gestão fazem: números
 * grandes no topo, o que está VENCIDO separado do que está em aberto, e
 * cada cartão leva para a tela onde se resolve. Nenhum deles tem frase
 * de explicação: o rótulo e o número dizem o que são, e quem quiser
 * detalhe clica.
 */
export default async function InternoInicioPage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes) ? searchParams.mes : mesAtual();

  const painel = await obterPainelInterno(mes);
  const { financeiro, carteira, custoFixo, folego, ano, vencido } = painel;
  const caixa = financeiro.resumo.saldoFinal;
  const sobra = carteira.recorrente - custoFixo;

  return (
    <>
      <AreaHeader titulo="Início" acao={<MonthNav mes={mes} />} />

      {/* 1. O ANO */}
      <Secao
        titulo={`O ano de ${ano.ano}`}
        acao={
          <Link
            href={`/interno/financeiro/resumo-anual?ano=${ano.ano}&mes=${mes}`}
            className="font-medium text-gray-600 hover:underline"
          >
            Abrir o resumo do ano
          </Link>
        }
      >
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Faturamento
              </p>
              <p className="mt-0.5 text-4xl font-bold tabular-nums tracking-tight text-gray-900 sm:text-5xl">
                {formatarMoeda(ano.recebido)}
              </p>
              {ano.mesesFaturados > 0 ? (
                <p className="mt-1 text-[13px] text-gray-500">
                  {ano.mesesFaturados}{" "}
                  {ano.mesesFaturados === 1 ? "mês" : "meses"}, média de{" "}
                  <strong className="font-semibold text-gray-700">
                    {formatarMoeda(ano.mediaMensal)}
                  </strong>
                </p>
              ) : null}
            </div>

            <dl className="flex flex-wrap gap-x-8 gap-y-3">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Saiu
                </dt>
                <dd className="mt-0.5 text-xl font-bold tabular-nums text-gray-900">
                  {formatarMoeda(ano.pago)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  {ano.resultado >= 0 ? "Sobrou" : "Faltou"}
                </dt>
                <dd
                  className={
                    "mt-0.5 text-xl font-bold tabular-nums " +
                    (ano.resultado < 0 ? "text-alerta" : "text-gray-900")
                  }
                >
                  {formatarMoeda(Math.abs(ano.resultado))}
                </dd>
              </div>
              {ano.melhorMes ? (
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    Melhor mês
                  </dt>
                  <dd className="mt-0.5 text-xl font-bold text-gray-900">
                    {rotuloMesCurto(ano.melhorMes.mes)}
                    <span className="ml-1.5 text-sm font-semibold tabular-nums text-gray-500">
                      {formatarMoeda(ano.melhorMes.valor)}
                    </span>
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="mt-5 border-t border-gray-100 pt-4">
            <GraficoAno barras={ano.barras} mesFoco={mes} />
          </div>
        </div>
      </Secao>

      {/* 2. OS NÚMEROS DAS TRÊS ETAPAS */}
      <Secao titulo={rotuloMes(mes)}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Indicador
            rotulo="Em caixa"
            valor={formatarMoeda(caixa)}
            detalhe={
              folego.meses !== null && folego.ate
                ? `cobre até ${rotuloMes(folego.ate)}`
                : undefined
            }
            href={`/interno/financeiro/fluxo-caixa?mes=${mes}`}
            alerta={caixa < 0}
          />
          <Indicador
            rotulo="Vencido a receber"
            valor={formatarMoeda(vencido.aReceber)}
            detalhe={`${financeiro.aReceber.length} em aberto no mês`}
            href={`/interno/financeiro/lancamentos?mes=${mes}&situacao=vencido&tipo=Receita`}
            alerta={vencido.aReceber > 0}
          />
          <Indicador
            rotulo="Vencido a pagar"
            valor={formatarMoeda(vencido.aPagar)}
            detalhe={`${financeiro.aPagar.length} em aberto no mês`}
            href={`/interno/financeiro/lancamentos?mes=${mes}&situacao=vencido&tipo=Despesa`}
            alerta={vencido.aPagar > 0}
          />
          <Indicador
            rotulo="No funil"
            valor={formatarMoeda(painel.comercial.seTudoFechar)}
            detalhe={`${painel.comercial.emAberto} ${painel.comercial.emAberto === 1 ? "oportunidade" : "oportunidades"}`}
            href="/interno/comercial/funil"
          />
          <Indicador
            rotulo="Contratos"
            valor={String(painel.administrativo.contratosQuePedemConversa)}
            detalhe="pedem conversa"
            href="/interno/administrativo/clientes"
            alerta={painel.administrativo.contratosQuePedemConversa > 0}
          />
        </div>

        {sobra < 0 ? (
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border-l-4 border-alerta bg-alerta-soft py-2.5 pl-3 pr-3 text-sm text-gray-700">
            <span>
              As {carteira.ativos} mensalidades somam{" "}
              {formatarMoeda(carteira.recorrente)} e o custo fixo é{" "}
              {formatarMoeda(custoFixo)}:{" "}
              <strong className="font-semibold text-alerta">
                faltam {formatarMoeda(Math.abs(sobra))} por mês
              </strong>
              .
            </span>
            <Link
              href="/interno/comercial/funil"
              className="font-semibold text-alerta underline"
            >
              Ver o funil
            </Link>
          </p>
        ) : null}
      </Secao>

      {/* 3. O QUE PEDE AÇÃO, DE TODAS AS ETAPAS */}
      <Secao
        titulo="Precisa de você"
        acao={
          painel.compromissos.length > 10 ? (
            <Link
              href={`/interno/financeiro/lancamentos?mes=${mes}&situacao=aberto`}
              className="font-medium text-gray-600 hover:underline"
            >
              Ver todos os {painel.compromissos.length}
            </Link>
          ) : undefined
        }
      >
        {painel.compromissos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
            <p className="font-medium text-gray-900">
              Nada em aberto em {rotuloMes(mes)}
            </p>
          </div>
        ) : (
          <OrigemLista>
            {painel.compromissos.slice(0, 10).map((c) => (
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
      </Secao>

      {/* 4. PARA ONDE O CAIXA VAI */}
      <Secao
        titulo="O caixa ao longo do ano"
        acao={
          <Link
            href={`/interno/financeiro/fluxo-caixa?mes=${mes}`}
            className="font-medium text-gray-600 hover:underline"
          >
            Abrir o fluxo de caixa
          </Link>
        }
      >
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <GraficoCaixa pontos={ano.pontos} meses={mesesDoAno(ano.ano)} />
        </div>
      </Secao>
    </>
  );
}
