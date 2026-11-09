import { marcasDoEixo, tetoDoEixo, type BarraDoAno } from "@/lib/interno/ano";
import { rotuloMesCurto } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";

/**
 * Cores das duas séries. Validadas (faixa de luminosidade, croma,
 * separação para daltonismo e contraste) sobre o branco do cartão: o par
 * passa com ΔE 9,2 em deuteranopia, acima do alvo de 8. Não troque por
 * "um verde e um vermelho bonitos" sem revalidar.
 */
const ENTROU = "#0a8f63";
const SAIU = "#b02a1e";

const CINZA_EIXO = "#9ca3af";
const CINZA_MES = "#6b7280";
const CINZA_MES_VAZIO = "#d1d5db";

/** A medida do desenho. Muda com a largura da tela; o resto não muda. */
interface Geometria {
  largura: number;
  altura: number;
  margem: { topo: number; direita: number; baixo: number; esquerda: number };
  /** Grossura de cada coluna. Nunca passa de 24px depois de escalada. */
  barra: number;
  fonte: number;
}

/**
 * Duas medidas, não duas lógicas.
 *
 * O SVG escala junto com o cartão, então um desenho largo no celular
 * encolhe o texto até ninguém ler. A versão estreita é mais alta e tem
 * a mesma fonte num quadro menor, que é o que mantém o rótulo legível.
 */
const LARGA: Geometria = {
  largura: 720,
  altura: 236,
  margem: { topo: 16, direita: 8, baixo: 26, esquerda: 56 },
  barra: 16,
  fonte: 11,
};

const ESTREITA: Geometria = {
  largura: 360,
  altura: 250,
  margem: { topo: 12, direita: 4, baixo: 22, esquerda: 44 },
  barra: 10,
  fonte: 10,
};

/** O vão de 2px é o que separa as duas colunas. Nunca um contorno. */
const VAO = 2;

/** Rótulo curto do eixo: "15 mil" em vez de "R$ 15.000,00". */
function rotuloValor(valor: number, teto: number): string {
  if (valor === 0) return "0";
  if (teto >= 10_000) {
    const mil = valor / 1000;
    return `${mil.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  }
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

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
  const ploteL = L - M.esquerda - M.direita;
  const ploteA = A - M.topo - M.baixo;
  const base = M.topo + ploteA;
  const slot = ploteL / 12;

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
              stroke={m === 0 ? "#d1d5db" : "#e5e7eb"}
              strokeWidth={1}
            />
            <text
              x={M.esquerda - 8}
              y={y + fonte / 3}
              textAnchor="end"
              fill={CINZA_EIXO}
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
                fill="#f3f4f6"
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
              fill={b.comMovimento ? CINZA_MES : CINZA_MES_VAZIO}
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
