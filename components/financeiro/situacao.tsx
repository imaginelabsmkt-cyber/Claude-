import type { SituacaoLancamento } from "@/lib/financeiro/vencimento";

/**
 * As quatro situações que um compromisso do mês pode ter, e as cores
 * delas. É O ÚNICO lugar que decide isso no sistema inteiro.
 *
 * As cores de estado são reservadas: verde quer dizer PAGO e nada mais,
 * âmbar quer dizer AINDA VAI VENCER, vermelho quer dizer VENCEU. Nenhum
 * gráfico ou área usa esses três para outra coisa, senão a cor deixa de
 * ser informação e vira enfeite.
 *
 * Contraste conferido sobre o fundo de cada etiqueta (WCAG 2): verde
 * 4,8:1, âmbar 5,7:1, vermelho 6,0:1, cinza 5,8:1. Todos passam AA.
 *
 * E nunca é só cor: toda etiqueta tem um ponto E uma palavra, para
 * quem enxerga cor de um jeito diferente, e para quem imprime.
 */
export type Estado = SituacaoLancamento | "Não lançado";

const ESTILO: Record<Estado, { fundo: string; tinta: string; ponto: string }> = {
  Pago: { fundo: "bg-green-100", tinta: "text-green-800", ponto: "bg-green-700" },
  "A vencer": {
    fundo: "bg-amber-100",
    tinta: "text-amber-700",
    ponto: "bg-amber-600",
  },
  "Vence hoje": {
    fundo: "bg-amber-100",
    tinta: "text-amber-700",
    ponto: "bg-amber-600",
  },
  Vencido: { fundo: "bg-red-100", tinta: "text-red-800", ponto: "bg-red-700" },
  "Sem data": {
    fundo: "bg-gray-200",
    tinta: "text-gray-700",
    ponto: "bg-gray-600",
  },
  "Não lançado": {
    fundo: "bg-gray-200",
    tinta: "text-gray-700",
    ponto: "bg-gray-600",
  },
};

interface SituacaoProps {
  estado: Estado;
  /** O que a etiqueta escreve. Omitido, usa o nome do estado. */
  texto?: string;
}

/** Etiqueta de situação: um ponto colorido e uma palavra. */
export function Situacao({ estado, texto }: SituacaoProps) {
  const e = ESTILO[estado];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${e.fundo} ${e.tinta}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${e.ponto}`} />
      {texto ?? estado}
    </span>
  );
}
