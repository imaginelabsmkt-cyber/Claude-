import Link from "next/link";
import { formatarMoeda } from "@/lib/utils";
import { rotuloDaEtapa } from "@/lib/comercial/etapas";
import type { FunilParaMetas } from "@/lib/metas/funil";

/**
 * O funil do comercial, dentro das Metas.
 *
 * A Fran: "você tem que levar o comercial em consideração, quantos
 * clientes a gente está em negociação ou a gente está em conversa."
 *
 * A projeção pedia "12 clientes novos" e não dizia de onde sairiam.
 * Agora diz: estes aqui, nestas etapas, valendo isto. E a linha de
 * baixo faz a conta que importa, quantos ainda precisam ser
 * arrumados além dos que já estão em jogo.
 *
 * As etapas adiantadas (da reunião marcada em diante) ficam em
 * destaque. Contar um "Novo lead" frio como receita quase certa é o
 * jeito mais rápido de a projeção mentir.
 */
export function FunilNasMetas({
  funil,
  pedidos,
  faltam,
  ticketDaProjecao,
}: {
  funil: FunilParaMetas;
  /** Quantos clientes novos a projeção soma no período. */
  pedidos: number;
  faltam: number;
  ticketDaProjecao: number;
}) {
  const maior = Math.max(1, ...funil.porEtapa.map((e) => e.quantas));

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Em negociação hoje
          </p>
          <p className="text-2xl font-bold tabular-nums text-gray-900">
            {funil.quantas}
          </p>
          <p className="text-xs text-gray-500">
            {formatarMoeda(funil.valor)} por mês se todas fecharem
          </p>
        </div>

        <div className="border-t border-gray-100 pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Perto de decidir
          </p>
          <p className="text-2xl font-bold tabular-nums text-gray-900">
            {funil.quantasAdiantadas}
          </p>
          <p className="text-xs text-gray-500">
            reunião marcada, proposta ou negociação
          </p>
        </div>

        <div className="border-t border-gray-100 pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Faltam prospectar
          </p>
          <p
            className={
              "text-2xl font-bold tabular-nums " +
              (faltam > 0 ? "text-alerta" : "text-gray-900")
            }
          >
            {faltam}
          </p>
          <p className="text-xs text-gray-500">
            a projeção pede {pedidos}, o funil tem {funil.quantas}
          </p>
        </div>
      </div>

      <ul className="space-y-1.5 border-t border-gray-100 pt-3">
        {funil.porEtapa.map((e) => (
          <li key={e.etapa} className="flex items-center gap-3 text-sm">
            <span
              className={
                "w-44 shrink-0 truncate " +
                (e.adiantada ? "font-semibold text-gray-900" : "text-gray-600")
              }
            >
              {rotuloDaEtapa(e.etapa)}
            </span>
            <span className="h-3 min-w-0 flex-1 overflow-hidden rounded bg-gray-100">
              <span
                className={
                  "block h-full rounded " +
                  (e.adiantada ? "bg-area" : "bg-gray-300")
                }
                style={{ width: `${(e.quantas / maior) * 100}%` }}
              />
            </span>
            <span className="w-8 shrink-0 text-right tabular-nums text-gray-700">
              {e.quantas || ""}
            </span>
            <span className="w-28 shrink-0 text-right text-xs tabular-nums text-gray-500">
              {e.valor > 0 ? formatarMoeda(e.valor) : ""}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-1 border-t border-gray-100 pt-3 text-sm text-gray-600">
        {funil.ticketMedio != null ? (
          <span>
            Ticket médio do funil{" "}
            <strong className="font-semibold tabular-nums text-gray-900">
              {formatarMoeda(funil.ticketMedio)}
            </strong>
            {Math.abs(funil.ticketMedio - ticketDaProjecao) >= 1 ? (
              <>
                , e a projeção usa {formatarMoeda(ticketDaProjecao)}
              </>
            ) : null}
          </span>
        ) : null}
        <Link
          href="/interno/comercial/funil"
          className="ml-auto font-medium text-gray-600 hover:underline"
        >
          Abrir o funil
        </Link>
      </p>
    </div>
  );
}
