"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Abas da Empresa.
 *
 * Estas três telas eram três itens de menu (Pessoas, Contábil,
 * Administrativo). Viraram abas porque respondiam a mesma pergunta por
 * caminhos diferentes: as três mostram lançamentos do financeiro,
 * filtrados por categoria. Como menu, davam a impressão de quatro
 * lugares distintos com o mesmo dado dentro.
 */
const ABAS = [
  { href: "/interno/empresa/equipe", label: "Equipe" },
  { href: "/interno/empresa/prazos", label: "Prazos" },
  { href: "/interno/empresa/contratos", label: "Contratos e ferramentas" },
];

export function EmpresaTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-5 flex items-center gap-5 overflow-x-auto border-b border-gray-200">
      {ABAS.map((a) => {
        const ativa = pathname.startsWith(a.href);
        return (
          <Link
            key={a.href}
            href={a.href}
            className={
              "-mb-px shrink-0 border-b-2 px-1 pb-2 text-sm font-semibold transition-colors " +
              (ativa
                ? "border-area text-area"
                : "border-transparent text-gray-500 hover:text-gray-800")
            }
          >
            {a.label}
          </Link>
        );
      })}
    </div>
  );
}
