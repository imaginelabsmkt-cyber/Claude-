import type { ReactNode } from "react";
import { NavIcon } from "@/components/layout/nav-icon";

/** Tons do chip do ícone do cabeçalho. */
type HeaderTom = "indigo" | "azul" | "ambar" | "verde" | "vermelho" | "rosa";

const CHIP: Record<HeaderTom, string> = {
  indigo: "bg-brand-100 text-brand-700",
  azul: "bg-blue-100 text-blue-700",
  ambar: "bg-amber-100 text-amber-700",
  verde: "bg-green-100 text-green-700",
  vermelho: "bg-red-100 text-red-700",
  rosa: "bg-rose-100 text-rose-700",
};

interface PageHeaderProps {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  /** Nome do ícone (mesmo conjunto do menu, ver nav-icon). */
  icone?: string;
  /** Cor do chip do ícone. */
  tom?: HeaderTom;
}

/** Cabeçalho padrão de página, com ícone colorido, título, descrição e ação. */
export function PageHeader({
  titulo,
  descricao,
  acao,
  icone,
  tom = "indigo",
}: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {icone ? (
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${CHIP[tom]}`}
          >
            <NavIcon nome={icone} className="h-6 w-6" />
          </span>
        ) : null}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{titulo}</h1>
          {descricao ? (
            <p className="mt-1 text-sm text-gray-500">{descricao}</p>
          ) : null}
        </div>
      </div>
      {acao ? <div className="shrink-0">{acao}</div> : null}
    </div>
  );
}
