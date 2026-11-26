import Link from "next/link";
import { AreaHeader } from "@/components/interno/area-header";
import { BarrasRanqueadas } from "@/components/interno/barras-ranqueadas";
import { CartaoDoAno } from "@/components/interno/cartao-do-ano";
import { OrigemItem, OrigemLista } from "@/components/interno/origem-item";
import { Secao } from "@/components/interno/secao";
import { FaixaDaMeta } from "@/components/metas/faixa-da-meta";
import { MonthNav } from "@/components/financeiro/month-nav";
import { obterPainelInterno } from "@/lib/data/interno";
import { obterProjecao } from "@/lib/data/metas";
import { listarDemandas } from "@/lib/data/demandas";
import { demandasComoCompromissos } from "@/lib/empresa/demandas";
import { prazoEmPalavras } from "@/lib/comercial/atividades";
import { mesAtual, mesValido, rotuloMes } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard" };

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
 * Dashboard: o painel do sistema inteiro, não só do financeiro.
 *
 * Chamava "Início". A Fran corrigiu: "não é isso, é dashboard". E é
 * mesmo: início é onde você entra, dashboard é o que a tela faz.
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

  const [painel, metas, demandas] = await Promise.all([
    obterPainelInterno(mes),
    obterProjecao(),
    listarDemandas(),
  ]);

  /* As demandas internas entram na MESMA lista de pendências, não numa
     lista separada do lado: com duas listas, a pessoa somaria as duas
     de cabeça para saber o que fazer primeiro. Ordenadas junto, por
     urgência, e o que não tem prazo vai para o fim. */
  const agoraNaTela = new Date();
  const pendencias = [
    ...painel.compromissos,
    ...demandasComoCompromissos(demandas, agoraNaTela, prazoEmPalavras),
  ].sort((a, b) => {
    if (a.dias == null && b.dias == null) return 0;
    if (a.dias == null) return 1;
    if (b.dias == null) return -1;
    return a.dias - b.dias;
  });
  const {
    financeiro,
    carteira,
    custoFixo,
    folego,
    ano,
    meta,
    vencido,
    funilPorEtapa,
    receitaPorCliente,
    despesaPorCategoria,
  } = painel;
  const caixa = financeiro.resumo.saldoFinal;
  const sobra = carteira.recorrente - custoFixo;

  return (
    <>
      <AreaHeader acao={<MonthNav mes={mes} />} />

      {/* 0. A META, ANTES DE TUDO.
          "A gente tem que estar vendo aquilo ali todo dia." Virar
          área no menu resolve ONDE ir; não precisar ir é isto. */}
      <div className="mb-6">
        <FaixaDaMeta
          meta={metas.premissas.metaGuardada}
          guardadoProjetado={metas.projecao.guardadoAteAMeta}
          mesDaMeta={metas.premissas.mesDaMeta}
          mesEmQueBate={metas.projecao.mesEmQueBate}
          clientesHoje={metas.carteira.ativos.length}
          clientesNoFim={
            metas.projecao.meses[metas.projecao.meses.length - 1]
              ?.clientesNoTotal ?? metas.carteira.ativos.length
          }
          faltamClientes={metas.faltamClientes}
        />
      </div>

      {/* 1. O ANO */}
      <Secao
        titulo={`Desempenho anual · ${ano.ano}`}
        acao={
          <Link
            href={`/interno/financeiro/resumo-anual?ano=${ano.ano}&mes=${mes}`}
            className="font-medium text-gray-600 hover:underline"
          >
            Resumo anual
          </Link>
        }
      >
        <CartaoDoAno ano={ano} meta={meta} />
      </Secao>

      {/* 2. OS NÚMEROS DAS TRÊS ETAPAS */}
      <Secao titulo={rotuloMes(mes)}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Indicador
            rotulo="Saldo em caixa"
            valor={formatarMoeda(caixa)}
            detalhe={
              folego.meses !== null && folego.ate
                ? `cobertura até ${rotuloMes(folego.ate)}`
                : undefined
            }
            href={`/interno/financeiro/fluxo-caixa?mes=${mes}`}
            alerta={caixa < 0}
          />
          <Indicador
            rotulo="A receber em atraso"
            valor={formatarMoeda(vencido.aReceber)}
            detalhe={`${financeiro.aReceber.length} títulos em aberto`}
            href={`/interno/financeiro/lancamentos?mes=${mes}&situacao=vencido&tipo=Receita`}
            alerta={vencido.aReceber > 0}
          />
          <Indicador
            rotulo="A pagar em atraso"
            valor={formatarMoeda(vencido.aPagar)}
            detalhe={`${financeiro.aPagar.length} títulos em aberto`}
            href={`/interno/financeiro/lancamentos?mes=${mes}&situacao=vencido&tipo=Despesa`}
            alerta={vencido.aPagar > 0}
          />
          <Indicador
            rotulo="Em negociação"
            valor={formatarMoeda(painel.comercial.seTudoFechar)}
            detalhe={`${painel.comercial.emAberto} ${painel.comercial.emAberto === 1 ? "oportunidade" : "oportunidades"}`}
            href="/interno/comercial/funil"
          />
          <Indicador
            rotulo="Contratos"
            valor={String(painel.administrativo.contratosQuePedemConversa)}
            detalhe="a revisar"
            href="/interno/administrativo/clientes"
            alerta={painel.administrativo.contratosQuePedemConversa > 0}
          />
        </div>

        {sobra < 0 ? (
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border-l-4 border-alerta bg-alerta-soft py-2.5 pl-3 pr-3 text-sm text-gray-700">
            <span>
              <strong className="font-semibold text-alerta">
                Déficit de {formatarMoeda(Math.abs(sobra))}/mês
              </strong>{" "}
              entre a receita recorrente e o custo fixo.
            </span>
            <Link
              href="/interno/comercial/funil"
              className="font-semibold text-alerta underline"
            >
              Abrir o funil
            </Link>
          </p>
        ) : null}
      </Secao>

      {/* 3. AS OUTRAS DUAS ÁREAS, DESENHADAS
          "Não parece um sistema de gestão de uma empresa, onde tem
          administrativo, onde tem comercial." O painel mostrava o
          dinheiro e mais nada. */}
      {/* Colunas de jornal, não grade: os três cartões têm alturas bem
          diferentes (o funil tem 3 barras, as categorias têm 8) e numa
          grade de duas colunas o cartão curto deixava um buraco do
          tamanho do vizinho. `columns` equilibra sozinho; o
          `break-inside-avoid` impede que um cartão parta no meio. */}
      {funilPorEtapa.some((e) => e.valor > 0) ||
      receitaPorCliente.some((c) => c.valor > 0) ||
      despesaPorCategoria.some((c) => c.valor > 0) ? (
        <div className="lg:columns-2 lg:gap-x-4">
          {funilPorEtapa.some((e) => e.valor > 0) ? (
            <Secao
              className="break-inside-avoid"
              titulo="Funil por etapa"
              acao={
                <Link
                  href="/interno/comercial/funil"
                  className="font-medium text-gray-600 hover:underline"
                >
                  Funil
                </Link>
              }
            >
              <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
                <BarrasRanqueadas itens={funilPorEtapa} cor="#7a2740" ordenar={false} />
              </div>
            </Secao>
          ) : null}

          {receitaPorCliente.some((c) => c.valor > 0) ? (
            <Secao
              className="break-inside-avoid"
              titulo={`Receita por cliente · ${ano.ano}`}
              acao={
                <Link
                  href="/interno/administrativo/clientes"
                  className="font-medium text-gray-600 hover:underline"
                >
                  Carteira de clientes
                </Link>
              }
            >
              <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
                <BarrasRanqueadas
                  itens={receitaPorCliente}
                  cor="#1d5a9e"
                  limite={6}
                />
              </div>
            </Secao>
          ) : null}

          {/* "Quero que apareça de cada categoria o valor que a gente
              paga: categoria pró-labore, tanto; categoria tal, tanto."
              A folha do mês já responde isso dentro do mês; aqui é a
              conta do ANO, que é onde se vê que as assinaturas pesam
              mais do que parecia. */}
          {despesaPorCategoria.some((c) => c.valor > 0) ? (
            <Secao
              className="break-inside-avoid"
              titulo={`Despesas por categoria · ${ano.ano}`}
              acao={
                <Link
                  href={`/interno/financeiro?mes=${mes}`}
                  className="font-medium text-gray-600 hover:underline"
                >
                  Financeiro
                </Link>
              }
            >
              <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
                <BarrasRanqueadas
                  itens={despesaPorCategoria}
                  cor="#8a5a1e"
                  limite={8}
                />
              </div>
            </Secao>
          ) : null}
        </div>
      ) : null}

      {/* 4. O QUE PEDE AÇÃO, DE TODAS AS ETAPAS */}
      {/* O Dashboard responde "como a empresa está"; a Fila de
          trabalho responde "o que eu faço agora". Esta lista é a
          ponte entre as duas: mostra as cinco primeiras e manda para
          lá. Antes mostrava dez e levava para uma lista filtrada do
          financeiro, que é só um pedaço do que pede ação. */}
      <Secao
        titulo="Pendências"
        acao={
          <Link
            href="/interno/fila"
            className="font-medium text-gray-600 hover:underline"
          >
            {pendencias.length > 5
              ? `Fila de trabalho (${pendencias.length})`
              : "Fila de trabalho"}
          </Link>
        }
      >
        {pendencias.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
            <p className="font-medium text-gray-900">
              Nenhuma pendência em {rotuloMes(mes)}
            </p>
          </div>
        ) : (
          <OrigemLista>
            {pendencias.slice(0, 5).map((c) => (
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

    </>
  );
}
