import Link from "next/link";
import { AreaHeader } from "@/components/interno/area-header";
import { Secao } from "@/components/interno/secao";
import { Stat } from "@/components/interno/stat";
import { TabelaDaProjecao } from "@/components/metas/tabela-da-projecao";
import { PainelDasMetas } from "@/components/metas/painel-das-metas";
import { obterProjecao } from "@/lib/data/metas";
import { rotuloMesCurto } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Metas" };

/**
 * Metas: onde a agência quer chegar, e quando.
 *
 * Vem da planilha que a Fran montou. O pedido veio com a condição:
 * "eu quero que tudo se integre, o financeiro, o administrativo, tudo
 * se integre para a gente conseguir ficar sempre analisando essas
 * projeções que a gente está fazendo agora."
 *
 * Então três números que a planilha digitava à mão aqui são LIDOS:
 *
 *   clientes de hoje e faturamento  ->  carteira do Administrativo
 *   custo fixo de CADA MÊS          ->  contas fixas do Financeiro
 *
 * O último é o que mais muda a conta. Na planilha eram dois números
 * e uma data ("até fev", "a partir de mar"), porque a mentoria
 * acaba em fevereiro. Aqui cada mês soma as contas fixas que estão
 * valendo NELE — e quando uma assinatura for cancelada em abril, a
 * projeção muda sozinha.
 */
export default async function MetasPage() {
  const {
    projecao: p,
    premissas,
    contratacoes,
    ritmo,
    carteira,
    noBanco,
    primeiroMes,
    mapaDoCustoFixo,
    acabam,
    faltamClientes: faltam,
  } = await obterProjecao();

  const ultimo = p.meses[p.meses.length - 1];

  return (
    <>
      <AreaHeader contexto="Projeção, equipe e premissas" />

      {!noBanco ? (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            As premissas ainda não existem no banco. A projeção abaixo usa os
            números da planilha. Rode o <strong>ATUALIZAR.sql</strong> no
            Supabase para poder editar e salvar.
          </p>
        </div>
      ) : null}

      {p.semValor.length > 0 ? (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            <strong>A projeção está otimista.</strong>{" "}
            {p.semValor.map((c) => c.cargo).join(", ")}{" "}
            {p.semValor.length === 1 ? "entra" : "entram"} na conta sem valor
            definido — conta como R$ 0,00 até você preencher.
          </p>
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          rotulo="Meta"
          valor={formatarMoeda(premissas.metaGuardada)}
          detalhe={`guardado até ${rotuloMesCurto(premissas.mesDaMeta)}`}
        />
        <Stat
          rotulo="No ritmo de hoje"
          valor={formatarMoeda(p.guardadoAteAMeta)}
          alerta={p.diferencaParaAMeta < 0}
          detalhe={
            p.diferencaParaAMeta >= 0
              ? `${formatarMoeda(p.diferencaParaAMeta)} acima`
              : `faltam ${formatarMoeda(-p.diferencaParaAMeta)}`
          }
        />
        <Stat
          rotulo="Bate a meta em"
          valor={p.mesEmQueBate ? rotuloMesCurto(p.mesEmQueBate) : "—"}
          alerta={p.mesEmQueBate == null}
          detalhe={p.mesEmQueBate == null ? "não bate nesta janela" : undefined}
        />
        <Stat
          rotulo="Clientes no fim"
          valor={String(ultimo?.clientesNoTotal ?? carteira.ativos.length)}
          detalhe={`hoje são ${carteira.ativos.length}`}
        />
      </div>

      <Secao titulo={`Mês a mês até ${rotuloMesCurto(premissas.mesDaMeta)}`}>
        <TabelaDaProjecao
          meses={p.meses}
          pessoas={contratacoes.filter((c) => c.ativa)}
          meta={premissas.metaGuardada}
        />
      </Secao>

      <Secao titulo="Mexer na projeção">
        <PainelDasMetas
          premissas={premissas}
          contratacoes={contratacoes}
          ritmo={ritmo}
          meses={p.meses.map((m) => m.mes)}
          podeSalvar={noBanco}
        />
      </Secao>

      <Secao titulo="E se o imposto for 6% do faturamento">
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          {/* As duas contas lado a lado, não uma escolhida por mim: a
              diferença entre R$ 600 estimados e 6% do faturamento
              decide se a meta é batida, e quem decide qual vale é o
              contador. */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Com o imposto estimado
              </p>
              <p className="text-xl font-bold tabular-nums text-gray-900">
                {formatarMoeda(p.guardadoAteAMeta)}
              </p>
              <p className="text-xs text-gray-500">
                {formatarMoeda(premissas.impostoFixo)} por mês
              </p>
            </div>
            <div className="border-t border-gray-100 pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Com {Math.round(premissas.impostoPercentual * 100)}% do
                faturamento
              </p>
              <p className="text-xl font-bold tabular-nums text-gray-900">
                {formatarMoeda(p.guardadoPeloSimples)}
              </p>
              <p className="text-xs text-gray-500">
                {ultimo
                  ? `${formatarMoeda(ultimo.impostoPeloSimples)} no último mês`
                  : null}
              </p>
            </div>
            <div className="border-t border-gray-100 pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Diferença
              </p>
              <p
                className={
                  "text-xl font-bold tabular-nums " +
                  (p.guardadoPeloSimples < p.guardadoAteAMeta
                    ? "text-alerta"
                    : "text-gray-900")
                }
              >
                {formatarMoeda(
                  Math.abs(p.guardadoAteAMeta - p.guardadoPeloSimples),
                )}
              </p>
              <p className="text-xs text-gray-500">
                {p.guardadoPeloSimples >= premissas.metaGuardada
                  ? "a meta é batida nas duas contas"
                  : "nessa conta a meta não é batida"}
              </p>
            </div>
          </div>
          <p className="mt-4 border-t border-gray-100 pt-3 text-sm text-gray-600">
            Anexo III, 1ª faixa (até R$ 180 mil em 12 meses). Vale confirmar
            com o contador qual das duas é a sua.
          </p>
        </div>
      </Secao>

      <Secao titulo="De onde vêm os números">
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <ul className="space-y-1.5 text-sm text-gray-700">
            <li>
              <Link
                href="/interno/administrativo/clientes"
                className="font-semibold text-gray-900 hover:underline"
              >
                {carteira.ativos.length} clientes
              </Link>{" "}
              e{" "}
              <strong className="font-semibold text-gray-900">
                {formatarMoeda(carteira.recorrente)}
              </strong>{" "}
              por mês: da carteira do Administrativo.
            </li>
            <li>
              <Link
                href="/interno/financeiro/recorrencias"
                className="font-semibold text-gray-900 hover:underline"
              >
                {formatarMoeda(mapaDoCustoFixo[primeiroMes] ?? carteira.custoFixo)}
              </Link>{" "}
              de contas fixas em {rotuloMesCurto(primeiroMes)}: somadas das
              contas fixas que estão valendo nesse mês.
            </li>
            {acabam.map((a) => (
              <li key={a.descricao + a.mes}>
                <strong className="font-semibold text-gray-900">
                  {a.descricao}
                </strong>{" "}
                acaba em {rotuloMesCurto(a.mes)}, e com ela saem{" "}
                {formatarMoeda(a.valor)} por mês.
              </li>
            ))}
            <li>
              <Link
                href="/interno/administrativo/clientes"
                className="font-semibold text-gray-900 hover:underline"
              >
                {carteira.videosPorMes} vídeos
              </Link>{" "}
              por mês nos contratos de hoje
              {carteira.clientesSemVideos > 0 ? (
                <>
                  {" — "}
                  <strong className="font-semibold text-alerta">
                    {carteira.clientesSemVideos}{" "}
                    {carteira.clientesSemVideos === 1
                      ? "cliente está"
                      : "clientes estão"}{" "}
                    sem esse número
                  </strong>
                  , então a conta de editor e videomaker está por baixo.
                </>
              ) : (
                "."
              )}
            </li>
            <li>
              Quem pode virar esses clientes está no{" "}
              <Link
                href="/interno/comercial/funil"
                className="font-semibold text-gray-900 hover:underline"
              >
                funil do Comercial
              </Link>
              .
            </li>
            {faltam != null ? (
              <li>
                Para pagar tudo e guardar{" "}
                {formatarMoeda(premissas.guardarPorMes)} por mês no fim da
                janela, faturando{" "}
                <strong className="font-semibold text-gray-900">
                  {formatarMoeda(p.faturamentoMinimo)}
                </strong>
                : faltam <strong className="font-semibold text-gray-900">
                  {faltam}
                </strong>{" "}
                clientes no ticket de {formatarMoeda(premissas.ticketNovo)}.
              </li>
            ) : null}
          </ul>
        </div>
      </Secao>
    </>
  );
}
