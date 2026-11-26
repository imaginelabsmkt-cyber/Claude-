import Link from "next/link";
import { formatarMoeda } from "@/lib/utils";
import { rotuloDaEtapa } from "@/lib/comercial/etapas";
import { rotuloMesCurto } from "@/lib/financeiro/meses";
import type { FunilParaMetas } from "@/lib/metas/funil";

/**
 * De onde vêm os clientes novos.
 *
 * A Fran: "essa parte aqui de onde vêm os clientes novos, eu acho
 * que ela tá um pouco confusa. Acho que dá pra diagramar de uma
 * maneira que visualmente a gente já consegue identificar."
 *
 * Teve duas versões antes desta, e as duas erravam o alvo.
 *
 * A primeira listava as sete etapas em barras do mesmo tamanho. A
 * segunda fez as barras afunilarem de verdade, e ficou um funil
 * correto respondendo a pergunta errada: com quatro oportunidades em
 * sete etapas, cinco linhas ficavam vazias e a figura falava do
 * comercial, não da meta.
 *
 * A pergunta desta tela é outra: a projeção pede 18 clientes e o
 * funil tem 4. O buraco é o assunto. Então o desenho é UMA barra
 * dos 18, com o que já existe preenchido e o resto aberto. Dá para
 * ver o tamanho do buraco sem ler número nenhum.
 */
export function FunilNasMetas({
  funil,
  pedidos,
  faltam,
  ticketDaProjecao,
  mesDaMeta,
}: {
  funil: FunilParaMetas;
  /** Quantos clientes novos a projeção soma no período. */
  pedidos: number;
  faltam: number;
  ticketDaProjecao: number;
  mesDaMeta: string;
}) {
  const emConversa = funil.quantas - funil.quantasAdiantadas;

  /* A barra inteira é o que a projeção pede. Quando o funil tem mais
     do que isso, ela passa a ser o funil: senão o excedente ficaria
     de fora do desenho, e sobrar oportunidade é notícia boa. */
  const total = Math.max(pedidos, funil.quantas, 1);

  const faixas = [
    {
      chave: "adiantadas",
      quantas: funil.quantasAdiantadas,
      cor: "bg-area",
      texto: "text-white",
      rotulo: "já passaram da reunião",
      valor: funil.valorAdiantado,
    },
    {
      chave: "conversa",
      quantas: emConversa,
      cor: "bg-area/35",
      texto: "text-gray-900",
      rotulo: "em conversa",
      valor: funil.valor - funil.valorAdiantado,
    },
    {
      chave: "faltam",
      quantas: faltam,
      cor: "bg-gray-100",
      texto: "text-gray-500",
      rotulo: "ainda não estão em lugar nenhum",
      valor: null,
    },
  ].filter((f) => f.quantas > 0);

  const comGente = funil.porEtapa.filter((e) => e.quantas > 0);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-sm text-gray-700">
        A projeção pede{" "}
        <strong className="font-bold text-gray-900">{pedidos} clientes</strong>{" "}
        novos até {rotuloMesCurto(mesDaMeta)}. O comercial já tem{" "}
        <strong className="font-bold text-gray-900">{funil.quantas}</strong>{" "}
        deles em negociação.
      </p>

      {/* A barra: tudo o que a meta pede, numa linha só. */}
      <div className="mt-3 flex gap-1 overflow-hidden rounded-lg">
        {faixas.map((f) => (
          <div
            key={f.chave}
            style={{ width: `${(f.quantas / total) * 100}%` }}
            className={
              "flex h-11 min-w-[2.5rem] items-center justify-center rounded text-base font-bold tabular-nums " +
              f.cor +
              " " +
              f.texto
            }
          >
            {f.quantas}
          </div>
        ))}
      </div>

      {/* A legenda embaixo, na mesma ordem da barra. */}
      <ul className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1.5">
        {faixas.map((f) => (
          <li key={f.chave} className="flex items-center gap-2">
            <span
              className={"h-2.5 w-2.5 shrink-0 rounded-sm " + f.cor}
              aria-hidden
            />
            <span className="text-sm text-gray-600">
              <strong className="font-semibold text-gray-900">
                {f.quantas}
              </strong>{" "}
              {f.rotulo}
              {f.valor != null && f.valor > 0 ? (
                <span className="text-gray-500">
                  {", "}
                  {formatarMoeda(f.valor)} por mês
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-gray-100 pt-3 text-sm text-gray-600">
        {comGente.length > 0 ? (
          <span>
            {comGente.map((e, i) => (
              <span key={e.etapa}>
                {i > 0 ? <span className="text-gray-300">{" · "}</span> : null}
                {rotuloDaEtapa(e.etapa)}{" "}
                <strong className="font-semibold text-gray-900">
                  {e.quantas}
                </strong>
              </span>
            ))}
          </span>
        ) : (
          <span>Nenhuma oportunidade aberta no comercial.</span>
        )}

        {funil.ticketMedio != null &&
        Math.abs(funil.ticketMedio - ticketDaProjecao) >= 1 ? (
          <span className="text-gray-500">
            Ticket do funil {formatarMoeda(funil.ticketMedio)}, a projeção usa{" "}
            {formatarMoeda(ticketDaProjecao)}
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
