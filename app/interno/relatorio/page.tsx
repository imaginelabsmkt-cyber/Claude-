import { AreaHeader } from "@/components/interno/area-header";
import { BotaoImprimir } from "@/components/interno/botao-imprimir";
import { MonthNav } from "@/components/financeiro/month-nav";
import { obterPainelMes, listarClientesFinanceiro, listarLancamentos } from "@/lib/data/financeiro";
import { obterPainelInterno, obterRecorteArea } from "@/lib/data/interno";
import { obterCarteira } from "@/lib/data/comercial";
import { calcularRentabilidade } from "@/lib/financeiro/rentabilidade";
import { mesAnterior, mesAtual, mesValido, rotuloMes } from "@/lib/financeiro/meses";
import { variacao } from "@/lib/financeiro/calculo";
import { cn, formatarMoeda, formatarPercentual } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { mes?: string };
}

/** Linha de número com rótulo, no corpo do relatório. */
function Linha({
  rotulo,
  valor,
  detalhe,
  forte,
  alerta,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  forte?: boolean;
  alerta?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-gray-100 py-2 last:border-0">
      <span className={cn("text-sm", forte ? "font-semibold text-gray-900" : "text-gray-600")}>
        {rotulo}
        {detalhe ? (
          <span className="ml-2 text-xs font-normal text-gray-400">{detalhe}</span>
        ) : null}
      </span>
      <span
        className={cn(
          "shrink-0 tabular-nums",
          forte ? "text-base font-bold" : "text-sm font-medium",
          alerta ? "text-alerta" : "text-gray-900",
        )}
      >
        {valor}
      </span>
    </div>
  );
}

function Bloco({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="break-inside-avoid rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

/**
 * Relatório do mês: uma página que fecha o mês.
 *
 * Junta o que está espalhado pelas cinco áreas e pode ser impressa
 * (Ctrl+P) — o menu e os botões somem na impressão.
 */
export default async function RelatorioPage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes) ? searchParams.mes : mesAtual();
  const anterior = mesAnterior(mes);

  const [painel, financeiroAnterior, interno, carteira, lancamentos, clientes, pessoas, contabil, admin] =
    await Promise.all([
      obterPainelMes(mes),
      obterPainelMes(anterior),
      obterPainelInterno(mes),
      obterCarteira(mes),
      listarLancamentos({ mes }),
      listarClientesFinanceiro(),
      obterRecorteArea("pessoas", mes),
      obterRecorteArea("contabil", mes),
      obterRecorteArea("administrativo", mes),
    ]);

  const r = painel.resumo;
  const nomes = new Map(clientes.map((c) => [c.id, c.name]));
  const rent = calcularRentabilidade(lancamentos, nomes);

  const varReceita = variacao(r.receitas, financeiroAnterior.resumo.receitas);
  const varDespesa = variacao(r.despesas, financeiroAnterior.resumo.despesas);
  const sobraRecorrente = carteira.recorrente - carteira.custoFixo;

  const setaVariacao = (v: number | null) =>
    v === null
      ? undefined
      : `${v >= 0 ? "+" : ""}${formatarPercentual(v)} vs. ${rotuloMes(anterior)}`;

  return (
    <>
      <div className="print:hidden">
        <AreaHeader
          titulo="Relatório do mês"
          contexto={rotuloMes(mes)}
          acao={<MonthNav mes={mes} />}
        />
      </div>

      {/* Cabeçalho que só aparece no papel */}
      <div className="mb-5 hidden print:block">
        <h1 className="text-xl font-bold text-gray-900">
          Favie — fechamento de {rotuloMes(mes)}
        </h1>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 print:border-0 print:p-0">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            O mês fechou em
          </p>
          <p
            className={cn(
              "text-2xl font-bold tabular-nums",
              r.resultado >= 0 ? "text-gray-900" : "text-alerta",
            )}
          >
            {formatarMoeda(r.resultado)}
          </p>
          <p className="text-xs text-gray-500">
            margem de {formatarPercentual(r.margem)} · saldo em caixa{" "}
            {formatarMoeda(r.saldoFinal)}
          </p>
        </div>

        <div className="ml-auto print:hidden">
          <BotaoImprimir />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Bloco titulo="Dinheiro">
          <Linha
            rotulo="Receita recebida"
            valor={formatarMoeda(r.receitas)}
            detalhe={setaVariacao(varReceita)}
          />
          <Linha
            rotulo="Despesa paga"
            valor={formatarMoeda(r.despesas)}
            detalhe={setaVariacao(varDespesa)}
          />
          <Linha rotulo="Resultado do mês" valor={formatarMoeda(r.resultado)} forte alerta={r.resultado < 0} />
          <Linha rotulo="Saldo em caixa no fim" valor={formatarMoeda(r.saldoFinal)} forte />
          <Linha
            rotulo="Ficou a receber"
            valor={formatarMoeda(r.aReceber)}
            detalhe={`${painel.aReceber.length} lançamento(s)`}
            alerta={r.aReceber > 0}
          />
          <Linha
            rotulo="Ficou a pagar"
            valor={formatarMoeda(r.aPagar)}
            detalhe={`${painel.aPagar.length} lançamento(s)`}
            alerta={r.aPagar > 0}
          />
        </Bloco>

        <Bloco titulo="Carteira">
          <Linha rotulo="Clientes ativos" valor={String(carteira.ativos.length)} />
          <Linha rotulo="Receita recorrente" valor={formatarMoeda(carteira.recorrente)} />
          <Linha rotulo="Custo fixo" valor={formatarMoeda(carteira.custoFixo)} />
          <Linha
            rotulo={sobraRecorrente >= 0 ? "Sobra recorrente" : "Falta para o fixo"}
            valor={formatarMoeda(Math.abs(sobraRecorrente))}
            forte
            alerta={sobraRecorrente < 0}
          />
          <Linha
            rotulo="Ticket médio"
            valor={formatarMoeda(carteira.ticketMedio)}
            detalhe={`${carteira.inativos.length} sairam no ano`}
          />
        </Bloco>

        <Bloco titulo="Para onde foi o dinheiro">
          <Linha
            rotulo="Pessoas"
            valor={formatarMoeda(pessoas.realizado + pessoas.pendente)}
            detalhe="pró-labore e freelas"
          />
          <Linha
            rotulo="Contábil e fiscal"
            valor={formatarMoeda(contabil.realizado + contabil.pendente)}
            detalhe="DAS e contabilidade"
          />
          <Linha
            rotulo="Administrativo"
            valor={formatarMoeda(admin.realizado + admin.pendente)}
            detalhe="ferramentas e equipamentos"
          />
          <Linha
            rotulo="Custo direto de clientes"
            valor={formatarMoeda(rent.custoDiretoTotal)}
            detalhe="freela e tráfego com cliente"
          />
        </Bloco>

        <Bloco titulo="Quem mais rendeu">
          {rent.clientes.length === 0 ? (
            <p className="py-2 text-sm text-gray-500">
              Nenhuma receita paga com cliente apontado neste mês.
            </p>
          ) : (
            rent.clientes
              .slice(0, 6)
              .map((c) => (
                <Linha
                  key={c.clienteId}
                  rotulo={c.nome}
                  valor={formatarMoeda(c.resultadoComRateio)}
                  detalhe={`${formatarMoeda(c.receita)} de receita`}
                  alerta={c.resultadoComRateio < 0}
                />
              ))
          )}
        </Bloco>
      </div>

      {interno.compromissos.length > 0 ? (
        <section className="mt-4 break-inside-avoid rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            O que entra no mês que vem
          </h2>
          <ul className="space-y-1.5">
            {interno.compromissos.slice(0, 10).map((c) => (
              <li key={c.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-gray-700">{c.titulo}</span>
                <span className="flex shrink-0 items-baseline gap-3">
                  {c.valor > 0 ? (
                    <span className="tabular-nums text-gray-600">
                      {formatarMoeda(c.valor)}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "w-28 text-right text-xs font-semibold",
                      c.atrasado ? "text-alerta" : "text-gray-400",
                    )}
                  >
                    {c.prazo}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-4 text-xs text-gray-400 print:mt-6">
        Gerado pelo sistema interno da Favie · {rotuloMes(mes)} · os valores
        consideram o que foi efetivamente pago.
      </p>
    </>
  );
}
