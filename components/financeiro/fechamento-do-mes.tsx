import Link from "next/link";
import type { ParteDaFolha } from "@/lib/financeiro/folha";
import { formatarMoeda } from "@/lib/utils";

interface FechamentoDoMesProps {
  mes: string;
  rotulo: string;
  entrou: ParteDaFolha;
  saiu: ParteDaFolha;
  /** Quantos lançamentos do mês ainda não têm baixa. */
  emAberto: number;
  resultado: number;
  saldoFinal: number;
}

/**
 * O FIM do mês.
 *
 * A Fran: "não existe o momento em que eu digo que acabei". E não
 * existia mesmo — a tela terminava numa lista, e lista não tem fim.
 *
 * Não inventei estado novo no banco para isso. Um mês está fechado
 * quando TODO lançamento dele tem baixa: ou caiu, ou saiu. É uma
 * conta, não uma marcação — então não tem como ficar mentindo, como
 * ficaria um campo "fechado" marcado à mão enquanto sobram três
 * contas sem pagar.
 *
 * Enquanto falta, diz quanto falta e onde está. Quando não falta
 * mais, escreve o resultado do mês por extenso, que é o que a pessoa
 * procura quando fecha a planilha.
 */
export function FechamentoDoMes({
  mes,
  rotulo,
  entrou,
  saiu,
  emAberto,
  resultado,
  saldoFinal,
}: FechamentoDoMesProps) {
  const faltaReceber = entrou.total - entrou.pago;
  const faltaPagar = saiu.total - saiu.pago;
  const fechado = emAberto === 0 && entrou.total + saiu.total > 0;

  if (entrou.total + saiu.total === 0) return null;

  if (fechado) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4">
        <p className="text-sm font-bold text-green-800">
          {rotulo} está fechado.
        </p>
        <p className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-700">
          <span>
            receitas{" "}
            <strong className="font-semibold tabular-nums">
              {formatarMoeda(entrou.total)}
            </strong>
          </span>
          <span>
            despesas{" "}
            <strong className="font-semibold tabular-nums">
              {formatarMoeda(saiu.total)}
            </strong>
          </span>
          <span>
            {resultado >= 0 ? "sobrou" : "faltou"}{" "}
            <strong
              className={
                "font-semibold tabular-nums " +
                (resultado < 0 ? "text-alerta" : "")
              }
            >
              {formatarMoeda(Math.abs(resultado))}
            </strong>
          </span>
          <span>
            em caixa{" "}
            <strong className="font-semibold tabular-nums">
              {formatarMoeda(saldoFinal)}
            </strong>
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-sm font-bold text-gray-900">
        Falta dar baixa em {emAberto}{" "}
        {emAberto === 1 ? "lançamento" : "lançamentos"} para fechar {rotulo}.
      </p>
      <p className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600">
        {faltaReceber > 0 ? (
          <span>
            a receber{" "}
            <strong className="font-semibold tabular-nums text-gray-900">
              {formatarMoeda(faltaReceber)}
            </strong>
          </span>
        ) : null}
        {faltaPagar > 0 ? (
          <span>
            a pagar{" "}
            <strong className="font-semibold tabular-nums text-gray-900">
              {formatarMoeda(faltaPagar)}
            </strong>
          </span>
        ) : null}
        <Link
          href={`/interno/financeiro/lancamentos?mes=${mes}&situacao=aberto`}
          className="font-medium text-brand-700 hover:underline"
        >
          Ver só o que falta
        </Link>
      </p>

      {/* A barra é a fração do mês já resolvida. É ela que faz a
          pessoa querer chegar ao fim. */}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-green-700"
          style={{
            width: `${
              entrou.total + saiu.total > 0
                ? ((entrou.pago + saiu.pago) / (entrou.total + saiu.total)) * 100
                : 0
            }%`,
          }}
        />
      </div>
    </div>
  );
}
