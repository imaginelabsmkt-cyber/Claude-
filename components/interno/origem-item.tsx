import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { area, type AreaId } from "@/lib/interno/areas";

interface OrigemItemProps {
  /** A área de onde este item veio — define a tarja e a etiqueta. */
  origem: AreaId;
  titulo: string;
  descricao?: string;
  valor?: string;
  /** Texto do prazo (ex.: "vence amanhã"). */
  prazo?: string;
  /** Pinta o prazo de vermelho: venceu ou está vencendo. */
  atrasado?: boolean;
  acao?: ReactNode;
}

/**
 * Uma linha que sabe de onde veio.
 *
 * É a peça central da tela Início: seis linhas de cinco áreas diferentes,
 * cada uma com a tarja e a etiqueta da sua origem. A pessoa reconhece a
 * origem antes de ler o texto.
 */
export function OrigemItem({
  origem,
  titulo,
  descricao,
  valor,
  prazo,
  atrasado,
  acao,
}: OrigemItemProps) {
  return (
    <li
      data-area={origem}
      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-l-4 border-area px-3 py-2.5"
    >
      <span className="w-20 shrink-0 rounded bg-area-soft px-1.5 py-0.5 text-center text-[10px] font-bold uppercase tracking-wider text-area">
        {area(origem).label}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-gray-900">{titulo}</span>
        {descricao ? (
          <span className="block text-xs text-gray-500">{descricao}</span>
        ) : null}
      </span>

      {valor ? (
        <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
          {valor}
        </span>
      ) : null}

      {prazo ? (
        <span
          className={cn(
            "w-28 shrink-0 text-right text-xs font-semibold",
            atrasado ? "text-alerta" : "text-gray-500",
          )}
        >
          {prazo}
        </span>
      ) : null}

      {acao ? <span className="shrink-0">{acao}</span> : null}
    </li>
  );
}

/** Caixa branca que agrupa OrigemItem (a lista do Início). */
export function OrigemLista({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
      {children}
    </ul>
  );
}
