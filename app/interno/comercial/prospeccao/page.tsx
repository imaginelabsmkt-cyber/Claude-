import Link from "next/link";
import { AreaHeader } from "@/components/interno/area-header";
import { ComercialTabs } from "@/components/comercial/comercial-tabs";
import { Secao } from "@/components/interno/secao";
import { Stat } from "@/components/interno/stat";
import {
  listarInvestimentos,
  listarProspeccao,
  listarTodasEncerradas,
} from "@/lib/data/comercial";
import { motivosDaPerda } from "@/lib/comercial/encerrados";
import { BarrasRanqueadas } from "@/components/interno/barras-ranqueadas";
import { resultadoDosCanais } from "@/lib/comercial/canais";
import { InvestimentosPanel } from "@/components/comercial/investimentos-panel";
import { TabelaDeCanais } from "@/components/comercial/tabela-de-canais";
import { mesAtual } from "@/lib/financeiro/meses";
import {
  contatosPorCliente,
  montarFunil,
  resultadoPorCanal,
} from "@/lib/comercial/prospeccao";
import { LEAD_CHANNEL_OPTIONS } from "@/types";
import { formatarMoeda, formatarPercentual } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Painel de canais" };

/**
 * Prospecção: de onde vêm os clientes.
 *
 * A tela responde UMA pergunta: **em qual canal vale a pena gastar a
 * próxima hora?** Por isso não lista tarefa, roteiro nem meta diária
 * (isso é do guia da Vitória, que vive fora do sistema). Aqui ficam
 * só os NÚMEROS que o guia não tem: o funil de verdade e o resultado
 * de cada canal.
 *
 * As barras usam um tom só, não uma cor por canal. Cada linha já traz
 * o nome do canal do lado — pintar cada uma de uma cor seria decorar,
 * não informar, e cores que só decoram atrapalham quem enxerga cor de
 * um jeito diferente.
 */
export default async function ProspeccaoPage() {
  const [oportunidades, investimentos, encerradas] = await Promise.all([
    listarProspeccao(),
    listarInvestimentos(),
    listarTodasEncerradas(),
  ]);

  /* "Por que não fechou" vinha na tela de Encerradas, que deixou de
     existir. O lugar dele é aqui: é a mesma pergunta das outras
     barras desta tela — o que o comercial está perdendo e onde. */
  const motivos = motivosDaPerda(encerradas);

  /* O comparativo que faltava: o que cada canal trouxe CONTRA o que
     cada canal custou. Sem o custo, "indicação converte 50%" e
     "tráfego converte 8%" parecem a mesma informação, quando um é de
     graça e o outro consome R$ 500 por mês. */
  const porCanal = resultadoDosCanais(
    oportunidades.map((o) => ({
      channel: o.channel,
      ganha: o.stage === "Fechado",
      estimated_monthly: o.estimated_monthly,
    })),
    investimentos,
    LEAD_CHANNEL_OPTIONS,
  );
  const investido = investimentos.reduce((t, i) => t + Number(i.amount), 0);

  const funil = montarFunil(oportunidades, (o) => o.max_stage);
  const canais = resultadoPorCanal(oportunidades, LEAD_CHANNEL_OPTIONS);
  const custoEmContatos = contatosPorCliente(funil);

  const topo = funil[0]?.chegaram ?? 0;
  const fecharam = funil[funil.length - 1]?.chegaram ?? 0;
  const receitaFechada = canais.reduce((t, c) => t + c.receitaFechada, 0);
  const comMovimento = canais.filter((c) => c.total > 0);
  const maiorReceita = Math.max(...canais.map((c) => c.receitaFechada), 1);

  return (
    <>
      {/* "Os clientes que estão em prospecção não aparecem, só aparece
          tipo quantitativo." Esta tela é de NÚMEROS de propósito — a
          pergunta dela é "em qual canal vale gastar a próxima hora".
          Quem são fica no funil, e agora o caminho está escrito. */}
      <AreaHeader
        contexto="Painel de canais"
        acao={
          <Link
            href="/interno/comercial/funil?v=lista"
            className="text-sm font-medium text-gray-600 hover:underline"
          >
            Lista de oportunidades
          </Link>
        }
      />

      <ComercialTabs />

      {oportunidades.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <p className="font-medium text-gray-900">
            Nenhuma oportunidade cadastrada ainda
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            Cada oportunidade que você cadastrar no funil escolhe um canal:
            social selling, indicação, evento ou parceria. Quando houver
            algumas, esta tela mostra qual deles realmente vira cliente.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat rotulo="Oportunidades" valor={String(topo)} />
            <Stat rotulo="Convertidas" valor={String(fecharam)} />
            {custoEmContatos ? (
              <Stat
                rotulo="Contatos por conversão"
                valor={String(custoEmContatos)}
                detalhe="média até fechar"
              />
            ) : null}
            <Stat
              rotulo="Receita contratada"
              valor={formatarMoeda(receitaFechada)}
            />
            <Stat rotulo="Investido" valor={formatarMoeda(investido)} />
          </div>

          <Secao titulo="Canais: o que trouxe contra o que custou">
            <TabelaDeCanais linhas={porCanal} />
          </Secao>

          <Secao
            titulo="Conversão por etapa"
          >
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <ul className="space-y-3">
              {funil.map((d, i) => {
                const anterior = funil[i - 1];
                const perdaAqui =
                  anterior && anterior.chegaram > 0
                    ? 1 - d.chegaram / anterior.chegaram
                    : 0;
                return (
                  <li key={d.etapa}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-gray-700">{d.etapa}</span>
                      <span className="shrink-0 tabular-nums text-gray-500">
                        <strong className="font-semibold text-gray-900">
                          {d.chegaram}
                        </strong>{" "}
                        chegaram
                        {d.agora > 0 ? ` · ${d.agora} aqui agora` : ""}
                      </span>
                    </div>
                    <div className="mt-1 h-4 overflow-hidden rounded bg-gray-100">
                      <div
                        className="h-full rounded bg-area"
                        style={{ width: `${Math.max(d.doTopo * 100, 1)}%` }}
                      />
                    </div>
                    {perdaAqui > 0 ? (
                      <p className="mt-0.5 text-xs text-gray-500">
                        {formatarPercentual(perdaAqui)} não passou daqui
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
          </Secao>

          {motivos.length > 0 ? (
            <Secao titulo="Por que não fechou">
              <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
                {/* Ranqueado por QUANTAS vezes, não por dinheiro: a
                    pergunta aqui é o padrão que se repete, e um
                    contrato grande perdido uma vez não é padrão. */}
                <BarrasRanqueadas
                  itens={motivos.map((m) => ({
                    rotulo: m.motivo,
                    valor: m.quantas,
                    detalhe: `${formatarMoeda(m.valor)} em receita recorrente`,
                  }))}
                  cor="#b8301f"
                  formatar={(v) => (v === 1 ? "1 vez" : `${v} vezes`)}
                />
              </div>
            </Secao>
          ) : null}

          <Secao
            titulo="Desempenho por canal"
          >
          {comMovimento.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
              Nenhum canal com oportunidade ainda.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              {comMovimento.map((c) => (
                <li key={c.canal} className="px-4 py-3.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <Link
                      href={`/interno/comercial/funil?v=lista&canal=${encodeURIComponent(c.canal)}`}
                      className="text-sm font-semibold text-gray-900 hover:underline"
                    >
                      {c.canal}
                    </Link>
                    <span className="text-sm tabular-nums text-gray-600">
                      {c.fechadas} de {c.total}
                      {c.fechadas + c.perdidas > 0 ? (
                        <>
                          {" · "}
                          <strong className="font-semibold text-gray-900">
                            {formatarPercentual(c.conversao)}
                          </strong>{" "}
                          de conversão
                        </>
                      ) : (
                        " · nada decidido ainda"
                      )}
                    </span>
                  </div>

                  <div className="mt-1.5 h-4 overflow-hidden rounded bg-gray-100">
                    <div
                      className="h-full rounded bg-area"
                      style={{
                        width: `${Math.max(
                          (c.receitaFechada / maiorReceita) * 100,
                          c.receitaFechada > 0 ? 2 : 0,
                        )}%`,
                      }}
                    />
                  </div>

                  <p className="mt-1 text-xs text-gray-500">
                    <strong className="font-semibold text-gray-700">
                      {formatarMoeda(c.receitaFechada)}
                    </strong>{" "}
                    por mês conquistados
                    {c.receitaEmJogo > 0
                      ? ` · ${formatarMoeda(c.receitaEmJogo)} ainda em jogo em ${c.abertas} aberta(s)`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
          </Secao>
        </>
      )}

      {/* FORA do "se houver oportunidade": o gasto costuma vir antes
          do primeiro lead — paga-se a campanha e espera-se. Dentro do
          condicional, a tela nova não deixava lançar nada. */}
      <Secao titulo="Lançar investimento">
        <InvestimentosPanel investimentos={investimentos} mes={mesAtual()} />
      </Secao>
    </>
  );
}
