import Link from "next/link";
import { formatarMoeda } from "@/lib/utils";
import { rotuloMesCurto } from "@/lib/financeiro/meses";

/**
 * A meta, no alto do Dashboard.
 *
 * A Fran: "a gente tem que estar vendo aquilo ali todo dia."
 *
 * Virar área no menu resolve metade disso, resolve ONDE ir. A outra
 * metade é não precisar ir: o que se vê todo dia é a primeira tela,
 * não um item de menu que ainda pede um clique. Então a meta abre o
 * Dashboard, em uma faixa de três números, e o resto mora na área.
 *
 * Três números, não a tabela inteira: a pergunta diária é "estamos no
 * caminho?", e ela se responde com quanto falta e quando chega. O mês
 * a mês é para quando se vai MEXER na projeção, e aí vale o clique.
 */
export function FaixaDaMeta({
  meta,
  guardadoProjetado,
  mesDaMeta,
  mesEmQueBate,
  clientesHoje,
  clientesNoFim,
  faltamClientes,
}: {
  meta: number;
  guardadoProjetado: number;
  mesDaMeta: string;
  mesEmQueBate: string | null;
  clientesHoje: number;
  clientesNoFim: number;
  faltamClientes: number | null;
}) {
  const noCaminho = guardadoProjetado >= meta;
  const fracao = meta > 0 ? Math.min(1, Math.max(0, guardadoProjetado / meta)) : 0;

  return (
    <Link
      href="/interno/metas"
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
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            No ritmo de hoje
          </p>
          <p
            className={
              "text-2xl font-bold tabular-nums " +
              (noCaminho ? "text-green-700" : "text-alerta")
            }
          >
            {formatarMoeda(guardadoProjetado)}
          </p>
          <p className="text-xs text-gray-500">
            {noCaminho
              ? mesEmQueBate
                ? `bate em ${rotuloMesCurto(mesEmQueBate)}`
                : "no caminho"
              : `faltam ${formatarMoeda(meta - guardadoProjetado)}`}
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Clientes
          </p>
          <p className="text-2xl font-bold tabular-nums text-gray-900">
            {clientesHoje} → {clientesNoFim}
          </p>
          <p className="text-xs text-gray-500">
            {faltamClientes != null && faltamClientes > 0
              ? `${faltamClientes} para pagar tudo e guardar`
              : "a conta fecha"}
          </p>
        </div>
      </div>

      {/* A barra é a fração da meta que a projeção já alcança. */}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className={
            "h-full rounded-full " + (noCaminho ? "bg-green-700" : "bg-alerta")
          }
          style={{ width: `${Math.max(fracao * 100, 1)}%` }}
        />
      </div>
    </Link>
  );
}
