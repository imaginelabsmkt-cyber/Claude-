import { CORES_SITUACAO } from "@/components/interno/grafico-base";
import { formatarMoeda } from "@/lib/utils";
import type { ParteDaFolha } from "@/lib/financeiro/folha";

/**
 * Entrou contra saiu, na MESMA régua.
 *
 * Cada coluna da folha já trazia uma barrinha de situação, mas cada
 * uma era medida pelo próprio total: a de entrou e a de saiu ficavam
 * do mesmo tamanho mesmo com valores bem diferentes, e comparar as
 * duas — que é a pergunta do mês — dava errado.
 *
 * Aqui as duas barras são medidas pelo MAIOR dos dois totais. A barra
 * mais comprida é o número maior, e a diferença entre elas é o que
 * sobrou (ou o que faltou) do mês, sem ninguém somar nada de cabeça.
 *
 * Dentro de cada barra, a ordem é a do tempo: o que já aconteceu, o
 * que venceu e ainda não aconteceu, e o que ainda vai vencer. As três
 * cores vêm conferidas (contraste e daltonismo) e nunca aparecem
 * sozinhas: cada pedaço vem escrito com o valor embaixo.
 */

interface LadoDoMes {
  /** "Receitas" ou "Despesas". */
  rotulo: string;
  partes: ParteDaFolha;
}

interface GraficoDoMesProps {
  entrou: ParteDaFolha;
  saiu: ParteDaFolha;
}

const PEDACOS = [
  { chave: "pago", cor: CORES_SITUACAO.pago },
  { chave: "vencido", cor: CORES_SITUACAO.vencido },
  { chave: "aVencer", cor: CORES_SITUACAO.aVencer },
] as const;

function Barra({ lado, regua }: { lado: LadoDoMes; regua: number }) {
  const { partes } = lado;
  const largura = (valor: number) =>
    regua > 0 ? `${(valor / regua) * 100}%` : "0%";

  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-sm font-semibold text-gray-700">
        {lado.rotulo}
      </span>
      <span className="flex h-5 min-w-0 flex-1 gap-0.5 overflow-hidden rounded-md bg-gray-100">
        {PEDACOS.map(({ chave, cor }) =>
          partes[chave] > 0 ? (
            <span
              key={chave}
              className="h-full first:rounded-l-md last:rounded-r-md"
              style={{ width: largura(partes[chave]), backgroundColor: cor }}
              title={`${formatarMoeda(partes[chave])}`}
            />
          ) : null,
        )}
      </span>
      <span className="w-28 shrink-0 text-right text-sm font-bold tabular-nums text-gray-900 sm:w-32 sm:text-base">
        {formatarMoeda(partes.total)}
      </span>
    </div>
  );
}

/**
 * A chave das cores.
 *
 * Sem valor do lado de propósito: somar o que entra com o que sai dá
 * um número que não quer dizer nada ("R$ 23.187,95 a vencer" misturava
 * mensalidade a receber com pró-labore a pagar). O valor de cada
 * pedaço está na lista logo abaixo, linha por linha.
 */
function Chave({
  cor,
  texto,
  mostrar,
  alerta,
}: {
  cor: string;
  texto: string;
  mostrar: boolean;
  alerta?: boolean;
}) {
  if (!mostrar) return null;
  return (
    <span
      className={
        "flex items-center gap-1.5 " +
        (alerta ? "font-semibold text-alerta" : "text-gray-500")
      }
    >
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: cor }}
      />
      {texto}
    </span>
  );
}

export function GraficoDoMes({ entrou, saiu }: GraficoDoMesProps) {
  const regua = Math.max(entrou.total, saiu.total);
  if (regua <= 0) return null;

  const diferenca = entrou.total - saiu.total;

  return (
    <figure className="m-0">
      <div className="space-y-2">
        <Barra lado={{ rotulo: "Receitas", partes: entrou }} regua={regua} />
        <Barra lado={{ rotulo: "Despesas", partes: saiu }} regua={regua} />
      </div>

      <figcaption className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <Chave
          cor={CORES_SITUACAO.pago}
          texto="já caiu"
          mostrar={entrou.pago + saiu.pago > 0}
        />
        <Chave
          cor={CORES_SITUACAO.vencido}
          texto="venceu"
          mostrar={entrou.vencido + saiu.vencido > 0}
          alerta
        />
        <Chave
          cor={CORES_SITUACAO.aVencer}
          texto="ainda vai vencer"
          mostrar={entrou.aVencer + saiu.aVencer > 0}
        />
        <span className="text-gray-600">
          {diferenca >= 0 ? "entrou" : "saiu"}{" "}
          <strong
            className={
              "font-semibold tabular-nums " +
              (diferenca < 0 ? "text-alerta" : "text-gray-900")
            }
          >
            {formatarMoeda(Math.abs(diferenca))}
          </strong>{" "}
          a mais
        </span>
      </figcaption>
    </figure>
  );
}
