import { AreaHeader } from "@/components/interno/area-header";
import { ComercialTabs } from "@/components/comercial/comercial-tabs";
import { Stat } from "@/components/interno/stat";
import { listarProspeccao } from "@/lib/data/comercial";
import {
  contatosPorCliente,
  montarFunil,
  resultadoPorCanal,
} from "@/lib/comercial/prospeccao";
import { LEAD_CHANNEL_OPTIONS } from "@/types";
import { formatarMoeda, formatarPercentual } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Prospecção — de onde vêm os clientes.
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
  const oportunidades = await listarProspeccao();

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
      <AreaHeader
        contexto="De onde vêm os clientes, e qual canal fecha"
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
            <Stat rotulo="Viraram cliente" valor={String(fecharam)} />
            <Stat
              rotulo="Custo em contatos"
              valor={custoEmContatos ? `${custoEmContatos}` : ""}
              detalhe={
                custoEmContatos
                  ? "contatos para fechar 1"
                  : "ainda sem fechamento"
              }
            />
            <Stat
              rotulo="Mensalidade conquistada"
              valor={formatarMoeda(receitaFechada)}
            />
          </div>

          {/* ---------------- O funil ---------------- */}
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            O caminho até o sim
          </h2>
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
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
            {custoEmContatos ? (
              <p className="mt-4 border-l-4 border-area pl-3 text-sm text-gray-600">
                Na sua taxa de hoje, cada cliente novo custa cerca de{" "}
                <strong className="font-semibold text-gray-900">
                  {custoEmContatos} contatos
                </strong>
                . Para fechar mais um este mês, é esse o número de pessoas que
                precisa entrar no topo.
              </p>
            ) : null}
          </div>

          {/* ---------------- Por canal ---------------- */}
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Qual canal vira cliente
          </h2>
          {comMovimento.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
              Nenhum canal com oportunidade ainda.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
              {comMovimento.map((c) => (
                <li key={c.canal} className="px-4 py-3.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="text-sm font-semibold text-gray-900">
                      {c.canal}
                    </span>
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

          <p className="mt-4 border-l-4 border-area pl-3 text-sm text-gray-600">
            A barra mede a <strong>mensalidade conquistada</strong>, não a
            quantidade de contatos. Um canal que traz 40 conversas e fecha zero
            vale menos que um que traz 4 e fecha 2, e contar leads diria o
            contrário.
          </p>
        </>
      )}
    </>
  );
}
