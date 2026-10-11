import Link from "next/link";
import { AreaHeader } from "@/components/interno/area-header";
import { ComercialTabs } from "@/components/comercial/comercial-tabs";
import { MonthNav } from "@/components/financeiro/month-nav";
import { listarLeads, obterCarteira } from "@/lib/data/comercial";
import { valorDoFunil } from "@/lib/comercial/funil";
import { LEAD_STAGES_ABERTAS } from "@/types";
import { mesAtual, mesValido, rotuloMes } from "@/lib/financeiro/meses";
import { formatarMoeda, formatarPercentual } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { mes?: string };
}

/**
 * Comercial: a carteira de clientes e o quanto ela cobre do custo fixo.
 *
 * A tela abre com UMA frase em vez de quatro números soltos. "Clientes
 * ativos", "receita recorrente", "custo fixo" e "falta para cobrir" diziam
 * a mesma coisa que a barra logo abaixo — agora são a própria barra.
 */
export default async function ComercialPage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes) ? searchParams.mes : mesAtual();

  const [carteira, leads] = await Promise.all([
    obterCarteira(mes),
    listarLeads(LEAD_STAGES_ABERTAS),
  ]);
  const noFunil = valorDoFunil(leads);
  const cobertura = carteira.custoFixo
    ? carteira.recorrente / carteira.custoFixo
    : 0;
  const falta = carteira.custoFixo - carteira.recorrente;
  const clientesQueFaltam = Math.ceil(falta / (carteira.ticketMedio || 1));

  return (
    <>
      <AreaHeader
        titulo="Comercial"
        contexto={rotuloMes(mes)}
        acao={<MonthNav mes={mes} />}
      />

      <ComercialTabs />

      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-base font-semibold text-gray-900">
          {carteira.ativos.length} cliente(s) ativo(s) pagam{" "}
          {formatarMoeda(carteira.recorrente)} por mês
        </h2>

        <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className={
              "h-full rounded-full " + (falta > 0 ? "bg-alerta" : "bg-area")
            }
            style={{ width: `${Math.min(cobertura * 100, 100)}%` }}
          />
        </div>

        <p className="mt-2 text-sm text-gray-600">
          {falta > 0 ? (
            <>
              Cobre {formatarPercentual(Math.min(cobertura, 1))} do custo fixo de{" "}
              {formatarMoeda(carteira.custoFixo)}.{" "}
              <strong className="font-semibold text-alerta">
                Faltam {formatarMoeda(falta)} por mês
              </strong>{" "}
              — cerca de {clientesQueFaltam} cliente(s) do tamanho médio da carteira (
              {formatarMoeda(carteira.ticketMedio)}).
            </>
          ) : (
            <>
              Cobre o custo fixo de {formatarMoeda(carteira.custoFixo)} e{" "}
              <strong className="font-semibold text-gray-900">
                sobram {formatarMoeda(Math.abs(falta))} por mês
              </strong>
              .
            </>
          )}
        </p>
      </div>

      <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
        Carteira ativa
      </h2>
      {carteira.ativos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-500">
          Nenhum cliente ativo com mensalidade cadastrada.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {carteira.ativos.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 border-l-4 border-area px-4 py-2.5"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-gray-900">{c.nome}</span>
                <span className="block text-xs text-gray-500">
                  {c.mensal > 0 ? "mensalidade ativa" : "sem mensalidade cadastrada"}
                  {c.pagoNoAno > 0 ? ` · ${formatarMoeda(c.pagoNoAno)} no ano` : ""}
                </span>
              </span>
              <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-900">
                {c.mensal > 0 ? formatarMoeda(c.mensal) : "—"}
              </span>
              <span
                className={
                  "w-24 shrink-0 text-right text-xs font-semibold " +
                  (c.pendenteNoMes > 0 ? "text-alerta" : "text-gray-400")
                }
              >
                {c.pendenteNoMes > 0 ? "em aberto" : "em dia"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {carteira.inativos.length > 0 ? (
        <details className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <summary className="cursor-pointer px-4 py-3 text-sm text-gray-600 hover:bg-gray-50">
            <span className="font-semibold text-gray-900">
              {carteira.inativos.length} já foram
            </span>{" "}
            — {formatarMoeda(carteira.perdidoPorMes)} por mês que deixaram de entrar
          </summary>
          <ul className="divide-y divide-gray-100 border-t border-gray-200">
            {carteira.inativos.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-3 px-4 py-2.5">
                <span className="min-w-0 flex-1 text-sm text-gray-600">{c.nome}</span>
                <span className="shrink-0 text-xs text-gray-500">
                  último pagamento em {c.ultimoMes ?? "—"}
                </span>
                <span className="w-28 shrink-0 text-right text-sm tabular-nums text-gray-500">
                  {formatarMoeda(c.ultimoValor)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="text-sm font-semibold text-gray-900">
            No funil: {formatarMoeda(noFunil)} por mês
          </h2>
          <span className="text-xs text-gray-500">
            em {leads.length} oportunidade(s) aberta(s)
          </span>
          <Link
            href="/interno/comercial/funil"
            className="ml-auto text-sm font-medium text-area hover:underline"
          >
            Abrir o funil →
          </Link>
        </div>
        {falta > 0 ? (
          <p className="mt-1.5 text-xs text-gray-600">
            {noFunil >= falta
              ? `Se tudo que está aberto fechar, o custo fixo fica coberto com ${formatarMoeda(noFunil - falta)} de sobra.`
              : `Mesmo fechando tudo, ainda faltariam ${formatarMoeda(falta - noFunil)} por mês.`}
          </p>
        ) : null}
      </div>
    </>
  );
}
