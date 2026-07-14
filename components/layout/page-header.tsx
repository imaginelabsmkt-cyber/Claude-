import type { ReactNode } from "react";

interface PageHeaderProps {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}

/** Cabeçalho padrão de página, com título, descrição e ação opcional. */
export function PageHeader({ titulo, descricao, acao }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{titulo}</h1>
        {descricao ? (
          <p className="mt-1 text-sm text-gray-500">{descricao}</p>
        ) : null}
      </div>
      {acao ? <div className="shrink-0">{acao}</div> : null}
    </div>
  );
}
