/**
 * O que os gráficos do sistema têm em comum.
 *
 * Todos desenham doze meses no eixo de baixo, todos são SVG montado no
 * servidor (sem JavaScript) e todos aparecem em duas medidas, porque o
 * SVG escala junto com o cartão e um desenho largo encolhe o texto até
 * ninguém ler no celular.
 */

/** Cores das séries, validadas sobre o papel creme do cartão. */
export const CORES = {
  /** Dinheiro que entrou. */
  entrou: "#0a8f63",
  /** Dinheiro que saiu. */
  saiu: "#b02a1e",
  /** O caixa. Vinho da marca: é o número da casa, não uma das pontas. */
  caixa: "#6a2336",
  /** Venceu ou está vencendo. Nunca é cor de série. */
  alerta: "#c0281f",
} as const;

export const TRACO = {
  eixo: "#d6cabb",
  grade: "#e9e1d5",
  texto: "#a99c92",
  mes: "#5d524e",
  mesVazio: "#d6cabb",
  /** Cor do papel do cartão, usada nos vãos e nos anéis dos pontos. */
  papel: "#fffdf8",
  /** Fundo do mês em foco. */
  foco: "#f4eee5",
} as const;

/** A medida do desenho. Muda com a largura da tela; o resto não muda. */
export interface Geometria {
  largura: number;
  altura: number;
  margem: { topo: number; direita: number; baixo: number; esquerda: number };
  /** Grossura de cada coluna. Nunca passa de 24px depois de escalada. */
  barra: number;
  fonte: number;
}

export const LARGA: Geometria = {
  largura: 720,
  altura: 236,
  margem: { topo: 16, direita: 10, baixo: 26, esquerda: 56 },
  barra: 16,
  fonte: 11,
};

export const ESTREITA: Geometria = {
  largura: 360,
  altura: 250,
  margem: { topo: 12, direita: 6, baixo: 22, esquerda: 44 },
  barra: 10,
  fonte: 10,
};

/** Rótulo curto do eixo: "15 mil" em vez de "R$ 15.000,00". */
export function rotuloValor(valor: number, escala: number): string {
  if (valor === 0) return "0";
  if (Math.abs(escala) >= 10_000) {
    const mil = valor / 1000;
    return `${mil.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  }
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

/** Onde fica o centro do mês `i` (0 a 11) na régua de doze. */
export function centroDoMes(geo: Geometria, i: number): number {
  const plote = geo.largura - geo.margem.esquerda - geo.margem.direita;
  return geo.margem.esquerda + (plote / 12) * i + plote / 24;
}

/** Largura de um mês na régua de doze. */
export function larguraDoMes(geo: Geometria): number {
  return (geo.largura - geo.margem.esquerda - geo.margem.direita) / 12;
}
