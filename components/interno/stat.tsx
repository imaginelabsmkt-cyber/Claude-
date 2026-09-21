import { cn } from "@/lib/utils";
import type { AreaId } from "@/lib/interno/areas";

interface StatProps {
  rotulo: string;
  valor: string;
  detalhe?: string;
  /**
   * Quando o número vem de OUTRA área (ex.: dinheiro dentro da tela de
   * Pessoas), informe a área de origem para ele carregar aquela cor.
   * Sem isso, usa a cor da área da tela.
   */
  origem?: AreaId;
  /** Pinta o valor de vermelho — use só quando é uma pendência real. */
  alerta?: boolean;
}

/** Número com o filete colorido da área de onde o dado vem. */
export function Stat({ rotulo, valor, detalhe, origem, alerta }: StatProps) {
  return (
    <div
      data-area={origem}
      className="rounded-xl border border-gray-200 border-t-[3px] border-t-area bg-white p-3.5"
    >
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-500">
        {rotulo}
      </p>
      <p
        className={cn(
          "mt-1 text-xl font-bold tabular-nums",
          alerta ? "text-alerta" : "text-gray-900",
        )}
      >
        {valor}
      </p>
      {detalhe ? <p className="mt-0.5 text-xs text-gray-500">{detalhe}</p> : null}
    </div>
  );
}
