import Link from "next/link";
import { formatarMoeda } from "@/lib/utils";
import { rotuloMesCurto } from "@/lib/financeiro/meses";

/**
 * A meta, no alto do Dashboard.
 *
 * A Fran: "a gente tem que estar vendo aquilo ali todo dia."
 *
 * A primeira versão mostrava "no ritmo de hoje, R$ 87.475,98", e ela
 * dizia sempre a mesma coisa: verde, no caminho. Tinha que dizer: o
 * ritmo passou a ser CALCULADO para bater a meta, então comparar o
 * resultado com a meta é conferir se a conta sabe somar.
 *
 * O que muda todo dia é outra coisa: quantos clientes a meta exige
 * por mês, e quantos deles já estão no funil. É a mesma barra da
 * tela de Metas, menor: o pedaço cheio é o que o comercial já tem,
 * o vazio é o que ainda não existe em lugar nenhum.
 */
export function FaixaDaMeta({
  meta,
  mesDaMeta,
  porMes,
  pedidos,
  noFunil,
  adiantadas,
  faltam,
  naoChega,
  clientesHoje,
  clientesNoFim,
}: {
  meta: number;
  mesDaMeta: string;
  /** Clientes novos por mês que a meta exige. */
  porMes: number;
  /** O total de clientes novos até o mês da meta. */
  pedidos: number;
  /** Oportunidades abertas no comercial. */
  noFunil: number;
  /** Quantas delas já passaram da reunião. */
  adiantadas: number;
  faltam: number;
  /** A meta não sai nesta janela nem no teto da busca. */
  naoChega: boolean;
  clientesHoje: number;
  clientesNoFim: number;
}) {
  const total = Math.max(pedidos, noFunil, 1);
  const pedaco = (q: number) => `${(q / total) * 100}%`;
  const emConversa = noFunil - adiantadas;

  return (
    <Link
      href="/interno/metas"
      /* A cor diz de onde a informação vem: esta faixa mora no
         Dashboard mas é das Metas, e o pedaço cheio da barra é o
         mesmo amarelo da área para onde ela leva. */
      data-area="metas"
      className="block rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition-colors hover:bg-gray-50"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Meta até {rotuloMesCurto(mesDaMeta)}
          </p>
          <p className="text-2xl font-bold tabular-nums text-gray-900">
            {formatarMoeda(meta)}
          </p>
          <p className="text-xs text-gray-500">
            {clientesHoje} clientes hoje, {clientesNoFim} no fim
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Precisa fechar
          </p>
          <p
            className={
              "text-2xl font-bold tabular-nums " +
              (naoChega ? "text-alerta" : "text-gray-900")
            }
          >
            {naoChega ? `+${porMes}` : porMes}
            <span className="text-base font-semibold">/mês</span>
          </p>
          <p className="text-xs text-gray-500">
            {naoChega
              ? "nem nesse ritmo a meta sai"
              : `${pedidos} até ${rotuloMesCurto(mesDaMeta)}`}
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Já no comercial
          </p>
          <p className="text-2xl font-bold tabular-nums text-gray-900">
            {noFunil}
          </p>
          <p
            className={
              "text-xs " + (faltam > 0 ? "font-semibold text-alerta" : "text-gray-500")
            }
          >
            {faltam > 0 ? `faltam prospectar ${faltam}` : "o funil cobre a meta"}
          </p>
        </div>
      </div>

      {/* A mesma barra da tela de Metas: o que já existe, e o buraco. */}
      <div className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full">
        <div className="h-full rounded-full bg-area" style={{ width: pedaco(adiantadas) }} />
        <div className="h-full rounded-full bg-area/55" style={{ width: pedaco(emConversa) }} />
        <div className="h-full flex-1 rounded-full bg-gray-200" />
      </div>
    </Link>
  );
}
