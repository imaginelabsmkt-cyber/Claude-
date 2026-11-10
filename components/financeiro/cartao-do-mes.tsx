import { Conta } from "@/components/interno/conta";
import { GraficoDoMes } from "@/components/financeiro/grafico-do-mes";
import type { ParteDaFolha } from "@/lib/financeiro/folha";
import { formatarMoeda } from "@/lib/utils";

interface CartaoDoMesProps {
  saldoInicial: number;
  resultado: number;
  saldoFinal: number;
  /** O que ainda não caiu nem saiu da conta. */
  emAberto: number;
  /** Frase pronta da variação contra o mês anterior, se houver. */
  variacao: string | null;
  entrou: ParteDaFolha;
  saiu: ParteDaFolha;
}

/**
 * O cabeçalho do mês: a conta, as duas barras e o que falta dar baixa.
 *
 * Vive num componente só porque a prévia visual desenha ESTE arquivo.
 * A prévia tinha uma cópia do markup e a cópia envelheceu: ela me
 * mostrou os três números grudados num bloco só, e com os valores da
 * regra antiga, enquanto a página de verdade já estava certa. Já
 * aconteceu de eu mandar uma imagem dessas para a Fran como se fosse o
 * sistema dela. Não tem mais cópia.
 */
export function CartaoDoMes({
  saldoInicial,
  resultado,
  saldoFinal,
  emAberto,
  variacao,
  entrou,
  saiu,
}: CartaoDoMesProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
      {/* A conta do mês, com o sinal à vista: o saldo do dia 1, mais
          (ou menos) o que o mês fez, dá o saldo do fim. É a mesma
          conta da planilha e a mesma do dashboard. */}
      <Conta
        parcelas={[
          { rotulo: "Saldo no dia 1", valor: saldoInicial },
          {
            rotulo: resultado >= 0 ? "Sobrou" : "Faltou",
            valor: Math.abs(resultado),
            sinal: resultado >= 0 ? "+" : "−",
            alerta: resultado < 0,
          },
          {
            rotulo: "Saldo no fim",
            valor: saldoFinal,
            sinal: "=",
            alerta: saldoFinal < 0,
          },
        ]}
      />

      <div className="mt-4 border-t border-gray-100 pt-4">
        <GraficoDoMes entrou={entrou} saiu={saiu} />
      </div>

      {emAberto > 0 || variacao ? (
        <p className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-600">
          {/* O mês já está somado por inteiro, como na planilha. O que
              falta aqui é a BAIXA: quanto ainda não caiu nem saiu. */}
          {emAberto > 0 ? (
            <>
              Ainda não caiu nem saiu da conta{" "}
              <strong className="font-semibold text-gray-900">
                {formatarMoeda(emAberto)}
              </strong>
              .{" "}
            </>
          ) : null}
          {variacao ? <>A receita está {variacao}.</> : null}
        </p>
      ) : null}
    </div>
  );
}
