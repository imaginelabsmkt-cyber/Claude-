import { AreaHeader } from "@/components/interno/area-header";
import { FinanceTabs } from "@/components/financeiro/finance-tabs";
import { Secao } from "@/components/interno/secao";
import { Stat } from "@/components/interno/stat";
import { TabelaDaProjecao } from "@/components/metas/tabela-da-projecao";
import { PainelDasMetas } from "@/components/metas/painel-das-metas";
import {
  listarContasFixasDaProjecao,
  listarContratacoes,
  obterPremissas,
  obterRitmo,
} from "@/lib/data/metas";
import { obterCarteira } from "@/lib/data/comercial";
import { custoFixoPorMes, oQueAcabaNaJanela } from "@/lib/metas/custo-fixo";
import {
  clientesParaChegarA,
  mesesEntre,
  montarProjecao,
  somarMeses,
} from "@/lib/metas/projecao";
import { mesAtual, rotuloMesCurto } from "@/lib/financeiro/meses";
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
  const [{ premissas, noBanco }, contratacoes, ritmo, contasFixas, carteira] =
    await Promise.all([
      obterPremissas(),
      listarContratacoes(),
      obterRitmo(),
      listarContasFixasDaProjecao(),
      obterCarteira(mesAtual()),
    ]);

  /* A projeção começa no mês que vem: este já está acontecendo, e
     misturar o que é com o que seria é o que torna uma projeção
     inútil. */
  const primeiroMes = somarMeses(mesAtual(), 1);
  const quantos = Math.max(1, mesesEntre(primeiroMes, premissas.mesDaMeta) + 1);

  const mapaDoCustoFixo = custoFixoPorMes(contasFixas, primeiroMes, quantos);
  const acabam = oQueAcabaNaJanela(contasFixas, primeiroMes, quantos);

  const sistema = {
    clientesAtivos: carteira.ativos.length,
    faturamentoRecorrente: carteira.recorrente,
    custoFixoPorMes: mapaDoCustoFixo,
    custoFixoPadrao: carteira.custoFixo,
    /* Vídeos por mês nos contratos: o sistema ainda não guarda isso
       por cliente, então entra pelo que a projeção supõe por cliente
       novo. Quando os contratos tiverem a quantidade, sai daqui. */
    videosDeHoje: 0,
  };

  const p = montarProjecao(
    primeiroMes,
    premissas,
    contratacoes,
    ritmo,
    sistema,
  );

  const ultimo = p.meses[p.meses.length - 1];
  const faltam = clientesParaChegarA(
    p.faturamentoMinimo,
    carteira.recorrente,
    premissas.ticketNovo,
  );

  return (
    <>
      <AreaHeader titulo="Metas" />

      <FinanceTabs />

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

      <Secao titulo="De onde vêm os números">
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <ul className="space-y-1.5 text-sm text-gray-700">
            <li>
              <strong className="font-semibold text-gray-900">
                {carteira.ativos.length} clientes
              </strong>{" "}
              e{" "}
              <strong className="font-semibold text-gray-900">
                {formatarMoeda(carteira.recorrente)}
              </strong>{" "}
              por mês: da carteira do Administrativo.
            </li>
            <li>
              <strong className="font-semibold text-gray-900">
                {formatarMoeda(mapaDoCustoFixo[primeiroMes] ?? carteira.custoFixo)}
              </strong>{" "}
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
