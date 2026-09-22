import { AreaHeader } from "@/components/interno/area-header";
import { ComercialTabs } from "@/components/comercial/comercial-tabs";
import { Stat } from "@/components/interno/stat";
import { MonthNav } from "@/components/financeiro/month-nav";
import {
  calcularRentabilidade,
  receitaSemCliente,
} from "@/lib/financeiro/rentabilidade";
import { listarClientesFinanceiro, listarLancamentos } from "@/lib/data/financeiro";
import { mesAtual, mesValido, rotuloMes } from "@/lib/financeiro/meses";
import { cn, formatarMoeda, formatarPercentual } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { mes?: string; periodo?: string };
}

/**
 * Rentabilidade por cliente: quem se paga e quem dá prejuízo.
 *
 * Separa o custo DIRETO (freela e tráfego lançados com o cliente) do
 * INDIRETO (pró-labore, ferramentas), e rateia o indireto na proporção
 * da receita. A margem direta é fato; o rateio é estimativa.
 */
export default async function RentabilidadePage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes) ? searchParams.mes : mesAtual();
  const anual = searchParams.periodo === "ano";
  const ano = mes.slice(0, 4);

  const [lancamentos, clientes] = await Promise.all([
    anual
      ? listarLancamentos({ mesInicio: `${ano}-01`, mesFim: `${ano}-12` })
      : listarLancamentos({ mes }),
    listarClientesFinanceiro(),
  ]);

  const nomes = new Map(clientes.map((c) => [c.id, c.name]));
  const r = calcularRentabilidade(lancamentos, nomes);
  const semCliente = receitaSemCliente(lancamentos);
  const noPrejuizo = r.clientes.filter((c) => c.resultadoComRateio < 0);

  return (
    <>
      <AreaHeader
        titulo="Rentabilidade"
        contexto={anual ? `Ano de ${ano}` : rotuloMes(mes)}
        acao={<MonthNav mes={mes} />}
      />

      <ComercialTabs />

      <div className="mb-4 flex gap-2">
        <a
          href={`/interno/comercial/rentabilidade?mes=${mes}`}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
            anual
              ? "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
              : "border-area bg-area-soft text-area",
          )}
        >
          Só {rotuloMes(mes)}
        </a>
        <a
          href={`/interno/comercial/rentabilidade?mes=${mes}&periodo=ano`}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
            anual
              ? "border-area bg-area-soft text-area"
              : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50",
          )}
        >
          Ano de {ano}
        </a>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat rotulo="Receita recebida" valor={formatarMoeda(r.receitaTotal)} origem="financeiro" />
        <Stat
          rotulo="Custo direto"
          valor={formatarMoeda(r.custoDiretoTotal)}
          origem="financeiro"
          detalhe="Lançado com cliente"
        />
        <Stat
          rotulo="Custo indireto"
          valor={formatarMoeda(r.custoIndireto)}
          origem="financeiro"
          detalhe="Pró-labore, ferramentas, impostos"
        />
        <Stat
          rotulo="Resultado"
          valor={formatarMoeda(r.resultado)}
          alerta={r.resultado < 0}
        />
      </div>

      {r.clientes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <p className="font-medium text-gray-900">Nada pago neste período</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
            A rentabilidade só conta o que foi efetivamente pago — receita prometida
            não paga cliente nenhum.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-bold">Cliente</th>
                    <th className="px-4 py-2.5 text-right font-bold">Receita</th>
                    <th className="px-4 py-2.5 text-right font-bold">Custo direto</th>
                    <th className="px-4 py-2.5 text-right font-bold">Margem</th>
                    <th className="px-4 py-2.5 text-right font-bold">Rateio</th>
                    <th className="px-4 py-2.5 text-right font-bold">Sobra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {r.clientes.map((c) => (
                    <tr key={c.clienteId} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-gray-900">{c.nome}</span>
                        <span className="ml-2 text-xs text-gray-400">
                          {formatarPercentual(c.pesoNaReceita)} da receita
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                        {formatarMoeda(c.receita)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">
                        {c.custoDireto > 0 ? `− ${formatarMoeda(c.custoDireto)}` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        <span className="font-medium text-gray-900">
                          {formatarMoeda(c.margemDireta)}
                        </span>
                        <span className="ml-1.5 text-xs text-gray-400">
                          {formatarPercentual(c.margemPercentual)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-gray-400">
                        − {formatarMoeda(c.rateio)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right font-bold tabular-nums",
                          c.resultadoComRateio < 0 ? "text-alerta" : "text-gray-900",
                        )}
                      >
                        {formatarMoeda(c.resultadoComRateio)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {noPrejuizo.length > 0 ? (
            <p className="mt-4 border-l-4 border-alerta bg-alerta-soft py-2 pl-3 text-sm text-gray-700">
              <strong>
                {noPrejuizo.length === 1
                  ? `${noPrejuizo[0].nome} não cobre`
                  : `${noPrejuizo.length} clientes não cobrem`}
              </strong>{" "}
              a própria fatia do custo da agência. Ou o preço está defasado, ou o
              trabalho cresceu sem o contrato acompanhar.
            </p>
          ) : null}

          {semCliente > 0 ? (
            <p className="mt-3 text-xs text-gray-500">
              {formatarMoeda(semCliente)} de receita paga não tem cliente apontado —
              ela entra no total, mas não em nenhuma linha acima, e por isso mexe
              no rateio. Vale editar o lançamento e escolher o cliente.
            </p>
          ) : null}
        </>
      )}

      <div className="mt-5 border-l-4 border-area pl-3 text-sm text-gray-600">
        <p className="font-semibold text-gray-900">Como ler esta tela</p>
        <p className="mt-1">
          <strong>Margem</strong> é fato: receita menos o que foi gasto com aquele
          cliente. <strong>Rateio</strong> é estimativa — divide pró-labore,
          ferramentas e impostos entre os clientes na proporção do que cada um
          fatura. <strong>Sobra</strong> é o que realmente fica depois de tudo.
        </p>
        <p className="mt-1.5">
          Para o custo direto aparecer, lance a despesa do freela ou do tráfego
          escolhendo o cliente no campo <em>Cliente</em>.
        </p>
      </div>
    </>
  );
}
