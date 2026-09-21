import Link from "next/link";
import { AreaHeader } from "@/components/interno/area-header";
import { Stat } from "@/components/interno/stat";
import { MonthNav } from "@/components/financeiro/month-nav";
import { obterCarteira } from "@/lib/data/comercial";
import { mesAtual, mesValido, rotuloMes } from "@/lib/financeiro/meses";
import { formatarMoeda, formatarPercentual } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { mes?: string };
}

/**
 * Comercial: a carteira de clientes e o quanto ela cobre do custo fixo.
 *
 * O funil de leads e as propostas vêm na próxima etapa (precisam de
 * tabelas novas). Esta tela já funciona com o que existe: os clientes,
 * as mensalidades recorrentes e o custo fixo da empresa.
 */
export default async function ComercialPage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes) ? searchParams.mes : mesAtual();

  const carteira = await obterCarteira(mes);
  const cobertura = carteira.custoFixo
    ? carteira.recorrente / carteira.custoFixo
    : 0;
  const falta = carteira.custoFixo - carteira.recorrente;

  return (
    <>
      <AreaHeader
        titulo="Comercial"
        contexto={rotuloMes(mes)}
        acao={<MonthNav mes={mes} />}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          rotulo="Clientes ativos"
          valor={String(carteira.ativos.length)}
          detalhe={
            carteira.inativos.length > 0
              ? `${carteira.inativos.length} já saíram`
              : undefined
          }
        />
        <Stat
          rotulo="Receita recorrente"
          valor={formatarMoeda(carteira.recorrente)}
          detalhe="Se todos pagarem"
        />
        <Stat
          rotulo="Custo fixo"
          valor={formatarMoeda(carteira.custoFixo)}
          origem="financeiro"
        />
        <Stat
          rotulo={falta > 0 ? "Falta para cobrir" : "Sobra por mês"}
          valor={formatarMoeda(Math.abs(falta))}
          alerta={falta > 0}
        />
      </div>

      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-900">
            A carteira cobre {formatarPercentual(Math.min(cobertura, 1))} do custo fixo
          </h2>
          <span className="text-xs text-gray-500">
            {formatarMoeda(carteira.recorrente)} de {formatarMoeda(carteira.custoFixo)}
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-area"
            style={{ width: `${Math.min(cobertura * 100, 100)}%` }}
          />
        </div>
        {falta > 0 ? (
          <p className="mt-2 text-xs text-gray-600">
            Faltam {formatarMoeda(falta)} por mês — cerca de{" "}
            {Math.ceil(falta / (carteira.ticketMedio || 1))} cliente(s) do tamanho médio
            da carteira ({formatarMoeda(carteira.ticketMedio)}).
          </p>
        ) : null}
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
        <>
          <h2 className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Já foram — {formatarMoeda(carteira.perdidoPorMes)} por mês que deixaram de entrar
          </h2>
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
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
        </>
      ) : null}

      <p className="mt-4 border-l-4 border-area pl-3 text-sm text-gray-600">
        O funil de leads e as propostas entram na próxima etapa. Quando existirem,
        fechar uma proposta vai criar o cliente, o contrato e a mensalidade de uma vez —
        sem redigitar em lugar nenhum.{" "}
        <Link href="/interno/financeiro/recorrencias" className="font-medium underline">
          As mensalidades de hoje ficam nas recorrências.
        </Link>
      </p>
    </>
  );
}
