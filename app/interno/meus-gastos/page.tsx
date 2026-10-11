import { AreaHeader } from "@/components/interno/area-header";
import { Stat } from "@/components/interno/stat";
import { GastosPanel } from "@/components/pessoal/gastos-panel";
import { FixosPanel } from "@/components/pessoal/fixos-panel";
import { VincularPessoa } from "@/components/pessoal/vincular-pessoa";
import { MonthNav } from "@/components/financeiro/month-nav";
import { listarCategoriasUsadas, obterPainelPessoal } from "@/lib/data/pessoal";
import { mesAtual, mesValido, rotuloMes } from "@/lib/financeiro/meses";
import { formatarMoeda, formatarPercentual } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { mes?: string };
}

/**
 * Meus gastos — a única tela do sistema interno que NÃO é compartilhada.
 *
 * Cada sócia vê só os próprios lançamentos. Isso não é um filtro desta
 * página: é a policy `user_id = auth.uid()` no Postgres. Se esta tela
 * tentasse buscar os gastos da outra pessoa, o banco devolveria zero
 * linhas.
 *
 * A pergunta que a tela responde é "como está o MEU mês" — entrou,
 * saiu, sobrou, e para onde foi. Sem encadear saldo entre meses, que é
 * coisa do caixa da empresa, não de controle pessoal.
 */
export default async function PessoalPage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes) ? searchParams.mes : mesAtual();

  const [painel, categoriasUsadas] = await Promise.all([
    obterPainelPessoal(mes),
    listarCategoriasUsadas(),
  ]);
  const { resumo, proLabore } = painel;

  const maiorCategoria = painel.categorias[0]?.total ?? 0;

  return (
    <>
      <AreaHeader
        titulo="Meus gastos"
        contexto={rotuloMes(mes)}
        acao={<MonthNav mes={mes} />}
      />

      <p className="mb-5 flex items-start gap-2 rounded-xl border border-area bg-area-soft px-4 py-2.5 text-sm text-gray-700">
        <svg
          viewBox="0 0 24 24"
          className="mt-0.5 h-4 w-4 shrink-0 text-area"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <rect x="4" y="11" width="16" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
        </svg>
        <span>
          <strong className="font-semibold text-gray-900">
            Só você vê esta tela.
          </strong>{" "}
          Seus lançamentos aqui não aparecem para mais ninguém do sistema — quem
          garante isso é o banco de dados, não o desenho da página.
        </span>
      </p>

      {proLabore === null ? (
        <VincularPessoa pessoas={painel.pessoasSemLogin} />
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          rotulo="Entrou"
          valor={formatarMoeda(resumo.entrou)}
          detalhe={
            proLabore && proLabore.valor > 0
              ? `inclui ${formatarMoeda(proLabore.valor)} de pró-labore`
              : proLabore && proLabore.emAberto > 0
                ? `${formatarMoeda(proLabore.emAberto)} de pró-labore ainda não saiu da agência`
                : undefined
          }
        />
        <Stat rotulo="Saiu" valor={formatarMoeda(resumo.saiu)} />
        <Stat
          rotulo={resumo.sobrou >= 0 ? "Sobrou" : "Faltou"}
          valor={formatarMoeda(Math.abs(resumo.sobrou))}
          alerta={resumo.sobrou < 0}
          detalhe={
            resumo.aPagar > 0 || resumo.aReceber > 0
              ? `${formatarMoeda(resumo.sobraPrevista)} depois do que está em aberto`
              : undefined
          }
        />
        <Stat
          rotulo="Ainda vou pagar"
          valor={formatarMoeda(resumo.aPagar)}
          alerta={resumo.aPagar > 0}
        />
      </div>

      {resumo.entrou + resumo.aReceber > 0 ? (
        <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-900">
              {formatarPercentual(Math.min(resumo.comprometido, 1))} do que entra
              neste mês já tem destino
            </h2>
            {resumo.comprometido > 1 ? (
              <span className="text-xs font-semibold text-alerta">
                passou do que entra
              </span>
            ) : null}
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className={
                "h-full rounded-full " +
                (resumo.comprometido > 1 ? "bg-alerta" : "bg-area")
              }
              style={{ width: `${Math.min(resumo.comprometido * 100, 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <div>
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Lançamentos de {rotuloMes(mes)}
          </h2>
          <GastosPanel
            mes={mes}
            lancamentos={painel.lancamentos}
            categoriasUsadas={categoriasUsadas}
          />
        </div>

        <div>
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Para onde foi
          </h2>
          {painel.categorias.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
              Sem gastos ainda neste mês.
            </p>
          ) : (
            <ul className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
              {painel.categorias.map((c) => (
                <li key={c.nome}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-gray-700">{c.nome}</span>
                    <span className="shrink-0 font-medium tabular-nums text-gray-900">
                      {formatarMoeda(c.total)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-area"
                      style={{
                        width: `${Math.max((c.total / (maiorCategoria || 1)) * 100, 1)}%`,
                      }}
                    />
                  </div>
                  {c.emAberto > 0 ? (
                    <p className="mt-0.5 text-xs text-alerta">
                      {formatarMoeda(c.emAberto)} ainda não pago
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <details className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm text-gray-600 hover:bg-gray-50">
          <span className="font-semibold text-gray-900">Plano fixo</span> — o que
          repete todo mês ({painel.fixos.length} cadastrado
          {painel.fixos.length === 1 ? "" : "s"}
          {painel.fixosPendentes > 0
            ? `, ${painel.fixosPendentes} por lançar neste mês`
            : ""}
          )
        </summary>
        <div className="border-t border-gray-200 p-4">
          <FixosPanel
            mes={mes}
            fixos={painel.fixos}
            pendentes={painel.fixosPendentes}
          />
        </div>
      </details>
    </>
  );
}
