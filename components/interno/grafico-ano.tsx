import { marcasDoEixo, tetoDoEixo, type BarraDoAno } from "@/lib/interno/ano";
import {
  CORES,
  ESTREITA,
  LARGA,
  TRACO,
  larguraDoMes,
  rotuloValor,
  type Geometria,
} from "@/components/interno/grafico-base";
import { rotuloMesCurto } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";

const ENTROU = CORES.entrou;
const SAIU = CORES.saiu;

/** O vão de 2px é o que separa as duas colunas. Nunca um contorno. */
const VAO = 2;

interface DesenhoProps {
  geo: Geometria;
  barras: BarraDoAno[];
  teto: number;
  mesFoco?: string;
  className: string;
  descricao: string;
}

/** O gráfico em si, numa medida. */
function Desenho({ geo, barras, teto, mesFoco, className, descricao }: DesenhoProps) {
  const { largura: L, altura: A, margem: M, barra: B, fonte } = geo;
  const ploteA = A - M.topo - M.baixo;
  const base = M.topo + ploteA;
  const slot = larguraDoMes(geo);

  const altura = (valor: number) => (teto === 0 ? 0 : (valor / teto) * ploteA);

  /** Coluna com a ponta arredondada em cima e quadrada na base. */
  const coluna = (x: number, h: number) => {
    const y = base - h;
    const r = Math.min(4, h, B / 2);
    return [
      `M${x} ${base}`,
      `L${x} ${y + r}`,
      `Q${x} ${y} ${x + r} ${y}`,
      `L${x + B - r} ${y}`,
      `Q${x + B} ${y} ${x + B} ${y + r}`,
      `L${x + B} ${base}`,
      "Z",
    ].join(" ");
  };

  return (
    <svg
      viewBox={`0 0 ${L} ${A}`}
      className={`h-auto w-full ${className}`}
      role="img"
      aria-label={descricao}
    >
      {marcasDoEixo(teto).map((m) => {
        const y = base - altura(m);
        return (
          <g key={m}>
            <line
              x1={M.esquerda}
              x2={L - M.direita}
              y1={y}
              y2={y}
              stroke={m === 0 ? TRACO.eixo : TRACO.grade}
              strokeWidth={1}
            />
            <text
              x={M.esquerda - 8}
              y={y + fonte / 3}
              textAnchor="end"
              fill={TRACO.texto}
              style={{ fontSize: fonte }}
            >
              {rotuloValor(m, teto)}
            </text>
          </g>
        );
      })}

      {barras.map((b, i) => {
        const centro = M.esquerda + slot * i + slot / 2;
        const foco = b.mes === mesFoco;

        return (
          <g key={b.mes}>
            {foco ? (
              <rect
                x={M.esquerda + slot * i}
                y={M.topo}
                width={slot}
                height={ploteA}
                fill={TRACO.foco}
              />
            ) : null}

            {b.entrou > 0 ? (
              <path d={coluna(centro - B - VAO / 2, altura(b.entrou))} fill={ENTROU}>
                <title>
                  {`${rotuloMesCurto(b.mes)}: entrou ${formatarMoeda(b.entrou)}`}
                </title>
              </path>
            ) : null}

            {b.saiu > 0 ? (
              <path d={coluna(centro + VAO / 2, altura(b.saiu))} fill={SAIU}>
                <title>
                  {`${rotuloMesCurto(b.mes)}: saiu ${formatarMoeda(b.saiu)}`}
                </title>
              </path>
            ) : null}

            <text
              x={centro}
              y={A - M.baixo / 4}
              textAnchor="middle"
              fill={b.comMovimento ? TRACO.mes : TRACO.mesVazio}
              style={{ fontSize: fonte, fontWeight: foco ? 700 : 400 }}
            >
              {rotuloMesCurto(b.mes).slice(0, 3)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

interface GraficoAnoProps {
  barras: BarraDoAno[];
  /** Mês que a tela está olhando, destacado com um fundo suave. */
  mesFoco?: string;
}

/**
 * Entrou e saiu, mês a mês, no ano.
 *
 * Duas colunas por mês em vez de uma barra empilhada: empilhado responde
 * "quanto no total", e a pergunta aqui é "entrou mais do que saiu?", que
 * só duas alturas lado a lado respondem de olho.
 *
 * É SVG montado no servidor, sem JavaScript: cada coluna tem um
 * `<title>`, que o navegador mostra ao passar o mouse, e todos os
 * números ficam na tabela embaixo. Assim o gráfico funciona com leitor
 * de tela, no celular e numa página impressa.
 *
 * Nenhum valor é escrito em cima das colunas. O maior mês já está por
 * extenso no cartão acima, e um número por coluna seriam 24 números
 * disputando a atenção com as barras.
 */
export function GraficoAno({ barras, mesFoco }: GraficoAnoProps) {
  const teto = tetoDoEixo(barras.flatMap((b) => [b.entrou, b.saiu]));
  const comMovimento = barras.filter((b) => b.comMovimento);

  if (comMovimento.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">
        Nenhum lançamento neste ano ainda.
      </p>
    );
  }

  const descricao = `Entrou e saiu por mês. ${comMovimento
    .map(
      (b) =>
        `${rotuloMesCurto(b.mes)}: entrou ${formatarMoeda(b.entrou)}, saiu ${formatarMoeda(b.saiu)}`,
    )
    .join(". ")}`;

  return (
    <figure className="m-0">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-sm"
            style={{ background: ENTROU }}
          />
          Entrou
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-sm"
            style={{ background: SAIU }}
          />
          Saiu
        </span>
      </div>

      <Desenho
        geo={ESTREITA}
        barras={barras}
        teto={teto}
        mesFoco={mesFoco}
        className="sm:hidden"
        descricao={descricao}
      />
      <Desenho
        geo={LARGA}
        barras={barras}
        teto={teto}
        mesFoco={mesFoco}
        className="hidden sm:block"
        descricao={descricao}
      />

      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-700">
          Ver os números
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th scope="col" className="py-1.5 pr-3 font-semibold text-gray-600">
                  Mês
                </th>
                <th scope="col" className="py-1.5 pr-3 text-right font-semibold text-gray-600">
                  Entrou
                </th>
                <th scope="col" className="py-1.5 pr-3 text-right font-semibold text-gray-600">
                  Saiu
                </th>
                <th scope="col" className="py-1.5 text-right font-semibold text-gray-600">
                  Diferença
                </th>
              </tr>
            </thead>
            <tbody>
              {comMovimento.map((b) => (
                <tr key={b.mes} className="border-b border-gray-100">
                  <th scope="row" className="py-1.5 pr-3 text-left font-normal text-gray-700">
                    {rotuloMesCurto(b.mes)}
                  </th>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-gray-700">
                    {formatarMoeda(b.entrou)}
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-gray-700">
                    {formatarMoeda(b.saiu)}
                  </td>
                  <td
                    className={
                      "py-1.5 text-right font-semibold tabular-nums " +
                      (b.entrou - b.saiu < 0 ? "text-alerta" : "text-gray-900")
                    }
                  >
                    {formatarMoeda(b.entrou - b.saiu)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
