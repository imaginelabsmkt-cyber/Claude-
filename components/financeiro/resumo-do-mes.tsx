import { formatarMoeda } from "@/lib/utils";
import type { ParteDaFolha } from "@/lib/financeiro/folha";

/**
 * O cabeçalho do mês.
 *
 * A Fran, três vezes: "acho tudo confuso ainda". Fui olhar a tela
 * inteira, impressa, como ela recebe — e o problema não era nenhum
 * bloco: era que O MESMO NÚMERO APARECIA QUATRO VEZES, com um nome
 * diferente em cada lugar. R$ 14.450,00 estava como RECEITAS na conta
 * de cima, como TOTAL na tabela de situações, como TOTAL RECEITAS no
 * pé da lista e de novo no rodapé do fechamento. Quem lê quatro vezes
 * o mesmo valor com quatro rótulos diferentes procura a diferença
 * entre eles — e não existe diferença.
 *
 * Então aqui ficou só a conta, que é a única coisa que esta parte da
 * tela tem para dizer:
 *
 *   SALDO INICIAL + RECEITAS − DESPESAS = SALDO FINAL
 *
 * O que venceu já está marcado em vermelho na linha do cliente, lá
 * embaixo, com nome e tudo — melhor que um total. E quanto falta cair
 * está no rodapé do mês. Nada disso precisa estar aqui também.
 */

interface ResumoDoMesProps {
  saldoInicial: number;
  resultado: number;
  saldoFinal: number;
  /** Frase pronta da variação contra o mês anterior, se houver. */
  variacao: string | null;
  entrou: ParteDaFolha;
  saiu: ParteDaFolha;
}

function Numero({
  rotulo,
  valor,
  sinal,
  alerta,
  destaque,
}: {
  rotulo: string;
  valor: number;
  sinal?: string;
  alerta?: boolean;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-end gap-3">
      {sinal ? (
        <span aria-hidden className="pb-1 text-lg font-bold text-gray-400">
          {sinal}
        </span>
      ) : null}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
          {rotulo}
        </p>
        <p
          className={
            "tabular-nums font-bold " +
            (destaque ? "text-xl sm:text-2xl " : "text-lg ") +
            (alerta ? "text-alerta" : "text-gray-900")
          }
        >
          {formatarMoeda(valor)}
        </p>
      </div>
    </div>
  );
}

export function ResumoDoMes({
  saldoInicial,
  resultado,
  saldoFinal,
  variacao,
  entrou,
  saiu,
}: ResumoDoMesProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:flex sm:flex-wrap sm:items-end">
        <Numero rotulo="Saldo inicial" valor={saldoInicial} />
        <Numero rotulo="Receitas" valor={entrou.total} sinal="+" />
        <Numero rotulo="Despesas" valor={saiu.total} sinal="−" />
        <Numero
          rotulo="Saldo final"
          valor={saldoFinal}
          sinal="="
          alerta={saldoFinal < 0}
          destaque
        />
      </div>

      <p className="mt-2 text-sm text-gray-600">
        Resultado do mês{" "}
        <strong
          className={
            "font-semibold tabular-nums " +
            (resultado < 0 ? "text-alerta" : "text-gray-900")
          }
        >
          {resultado < 0 ? "−" : ""}
          {formatarMoeda(Math.abs(resultado))}
        </strong>
        {variacao ? <> · receita {variacao}</> : null}
      </p>
    </div>
  );
}
