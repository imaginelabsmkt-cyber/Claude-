import type { ReactNode } from "react";

interface EmptyStateProps {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}

/** Estado vazio padrão para listas sem registros. */
export function EmptyState({ titulo, descricao, acao }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center">
      <p className="text-base font-medium text-gray-900">{titulo}</p>
      {descricao ? (
        <p className="mt-1 max-w-sm text-sm text-gray-500">{descricao}</p>
      ) : null}
      {acao ? <div className="mt-4">{acao}</div> : null}
    </div>
  );
}
