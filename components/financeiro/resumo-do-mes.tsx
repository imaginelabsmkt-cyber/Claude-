import { formatarMoeda } from "@/lib/utils";
import { saldoDoMes } from "@/lib/financeiro/saldo";
import type { ParteDaFolha } from "@/lib/financeiro/folha";

/**
 * O cabeçalho do mês: saldo de verdade e previsão, separados.
 *
 * Do documento da Favie: "o topo mistura o que já aconteceu com o que
 * ainda vai acontecer". Misturava mesmo — o "saldo final" somava a
 * mensalidade que ninguém pagou e o pró-labore que só sai dia 10 do
 * mês que vem, e saía com cara de extrato.
 *
 * Agora: SALDO HOJE (só o que tem baixa) ao lado de PREVISÃO FIM DO
 * MÊS (se tudo for pago), e embaixo o que falta dos dois lados.
 */

interface ResumoDoMesProps {
  saldoInicial: number;
  /** Frase pronta da variação contra o mês anterior, se houver. */
  variacao: string | null;
  entrou: ParteDaFolha;
  saiu: ParteDaFolha;
}

function Numero({
  rotulo,
  valor,
  detalhe,
  forte,
}: {
  rotulo: string;
  valor: number;
  detalhe: string;
  forte?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
        {rotulo}
      </p>
      <p
        className={
          "tabular-nums font-bold " +
          (forte ? "text-2xl " : "text-2xl ") +
          (valor < 0 ? "text-alerta" : "text-gray-900")
        }
      >
        {formatarMoeda(valor)}
      </p>
      <p className="text-xs text-gray-500">{detalhe}</p>
    </div>
  );
}

export function ResumoDoMes({
  saldoInicial,
  variacao,
  entrou,
  saiu,
}: ResumoDoMesProps) {
  const s = saldoDoMes(saldoInicial, entrou, saiu);
  const faltaAlgo = s.faltaReceber > 0 || s.faltaPagar > 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <Numero
          rotulo="Saldo hoje"
          valor={s.hoje}
          detalhe="o que já entrou e já saiu de verdade"
          forte
        />
        {/* A previsão fica do lado, não embaixo: são a mesma pergunta
            em dois tempos, e separar por linha faria uma parecer
            consequência da outra. */}
        <div className="border-t border-gray-100 pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <Numero
            rotulo="Previsão fim do mês"
            valor={s.previsao}
            detalhe="se tudo for pago"
          />
        </div>
      </div>

      {faltaAlgo || variacao ? (
        <p className="mt-4 border-t border-gray-100 pt-3 text-sm text-gray-600">
          {s.faltaReceber > 0 ? (
            <>
              Falta receber{" "}
              <strong className="font-semibold tabular-nums text-gray-900">
                {formatarMoeda(s.faltaReceber)}
              </strong>
            </>
          ) : null}
          {s.faltaReceber > 0 && s.faltaPagar > 0 ? " · " : null}
          {s.faltaPagar > 0 ? (
            <>
              Falta pagar{" "}
              <strong className="font-semibold tabular-nums text-gray-900">
                {formatarMoeda(s.faltaPagar)}
              </strong>
            </>
          ) : null}
          {faltaAlgo && variacao ? " · " : null}
          {variacao ? <>receita {variacao}</> : null}
        </p>
      ) : null}
    </div>
  );
}
