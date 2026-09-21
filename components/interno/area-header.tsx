import type { ReactNode } from "react";

interface AreaHeaderProps {
  titulo: string;
  /** Aparece na pílula ao lado do título (ex.: "Fluxo de caixa"). */
  contexto?: string;
  /** Canto direito do cabeçalho — normalmente o período ou uma ação. */
  acao?: ReactNode;
}

/**
 * Cabeçalho padrão de uma tela do interno. O filete superior e o título
 * usam a cor da área — é o que diz "você está no financeiro" sem texto.
 */
export function AreaHeader({ titulo, contexto, acao }: AreaHeaderProps) {
  return (
    <div className="mb-5 border-t-[3px] border-area bg-white">
      <div className="flex flex-wrap items-center gap-3 border-x border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-bold tracking-tight text-area">{titulo}</h1>
        {contexto ? (
          <span className="rounded-full bg-area-soft px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-area">
            {contexto}
          </span>
        ) : null}
        {acao ? <div className="ml-auto">{acao}</div> : null}
      </div>
    </div>
  );
}
