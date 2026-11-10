import { formatarMoeda } from "@/lib/utils";

/**
 * Barras horizontais ranqueadas: o desenho que responde "quem é o
 * maior" sem ninguém somar nada de cabeça.
 *
 * A Fran, depois de abrir o Comercial e o Administrativo: "não tem
 * gráfico de porra nenhuma, não tem nada que me ajude a ficar
 * analisando o que está acontecendo". O Financeiro ganhou os dele e
 * as outras áreas ficaram para trás.
 *
 * Uma série só, uma cor só, e por isso sem legenda: o rótulo de cada
 * barra já diz o que ela é. A maior barra é a maior, e a largura de
 * cada uma é a fatia dela em relação à maior — não ao total, que é o
 * erro clássico de barra ranqueada, onde tudo encolhe quando a lista
 * cresce.
 */

export interface BarraRanqueada {
  /** O que a barra é. */
  rotulo: string;
  valor: number;
  /** Linha miúda embaixo do rótulo (opcional). */
  detalhe?: string;
}

interface BarrasRanqueadasProps {
  itens: BarraRanqueada[];
  /** Cor das barras, em hex. */
  cor?: string;
  /** Quantas mostrar. O resto vira uma linha "outros". */
  limite?: number;
  /** Como escrever o valor. Dinheiro, por padrão. */
  formatar?: (v: number) => string;
  /**
   * Ordenar do maior para o menor. Verdadeiro por padrão.
   *
   * O FUNIL é a exceção: as etapas têm ordem própria (contato,
   * diagnóstico, proposta, negociação) e embaralhar por valor
   * destrói a única coisa que um funil conta — o caminho. Ordenado
   * por dinheiro, ele deixa de ser funil e vira ranking de etapa.
   */
  ordenar?: boolean;
}

export function BarrasRanqueadas({
  itens,
  cor = "#6a2336",
  limite = 8,
  formatar = formatarMoeda,
  ordenar = true,
}: BarrasRanqueadasProps) {
  const vivos = [...itens].filter((i) => i.valor > 0);
  const ordenados = ordenar
    ? vivos.sort((a, b) => b.valor - a.valor)
    : vivos;

  if (ordenados.length === 0) return null;

  const mostrar = ordenados.slice(0, limite);
  const resto = ordenados.slice(limite);
  const sobra = resto.reduce((t, i) => t + i.valor, 0);
  // Com UM sobrando, "outros 1" é pior do que o nome dele: esconde
  // a informação e não economiza linha nenhuma.
  const linhas =
    resto.length === 1
      ? [...mostrar, resto[0]]
      : sobra
        ? [
            ...mostrar,
            {
              rotulo: `outros ${resto.length}`,
              valor: sobra,
              detalhe: undefined,
            },
          ]
        : mostrar;

  const maior = Math.max(...linhas.map((i) => i.valor));
  const total = ordenados.reduce((t, i) => t + i.valor, 0);

  return (
    <ul className="space-y-2.5">
      {linhas.map((i) => (
        <li key={i.rotulo}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-sm text-gray-900">
              {i.rotulo}
              {i.detalhe ? (
                <span className="ml-2 text-xs text-gray-500">{i.detalhe}</span>
              ) : null}
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
              {formatar(i.valor)}
              <span className="ml-2 text-xs font-normal tabular-nums text-gray-500">
                {total > 0 ? `${Math.round((i.valor / total) * 100)}%` : ""}
              </span>
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max((i.valor / maior) * 100, 2)}%`,
                backgroundColor: cor,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
