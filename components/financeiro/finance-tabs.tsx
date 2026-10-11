"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Abas do dia a dia do financeiro (mantêm o mês selecionado na URL).
 *
 * "Categorias e saldo inicial" não entra aqui: é configuração que se mexe
 * uma vez, não uma tela de consulta. Ela fica no link discreto da direita.
 */
const ABAS = [
  { href: "/interno/financeiro", label: "Painel do mês" },
  { href: "/interno/financeiro/lancamentos", label: "Lançamentos" },
  { href: "/interno/financeiro/fluxo-caixa", label: "Fluxo de caixa" },
  { href: "/interno/financeiro/resumo-anual", label: "Resumo anual" },
  { href: "/interno/financeiro/recorrencias", label: "Recorrências" },
];

const CONFIGURACAO = "/interno/financeiro/categorias";

/**
 * Navegação interna do financeiro. Cada aba é uma responsabilidade só —
 * e o mês em foco (?mes=) viaja junto para não se perder na troca de tela.
 */
export function FinanceTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mes = searchParams.get("mes");
  const naConfiguracao = pathname.startsWith(CONFIGURACAO);

  return (
    <div className="mb-6 flex items-center gap-5 overflow-x-auto border-b border-gray-200">
      {ABAS.map((aba) => {
        const ativa =
          aba.href === "/interno/financeiro"
            ? pathname === "/interno/financeiro"
            : pathname.startsWith(aba.href);
        const href = mes ? `${aba.href}?mes=${mes}` : aba.href;
        return (
          <Link
            key={aba.href}
            href={href}
            className={
              "-mb-px shrink-0 border-b-2 px-1 pb-2 text-sm font-semibold transition-colors " +
              (ativa
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-gray-500 hover:text-gray-800")
            }
          >
            {aba.label}
          </Link>
        );
      })}

      <Link
        href={CONFIGURACAO}
        className={
          "-mb-px ml-auto shrink-0 border-b-2 px-1 pb-2 text-xs transition-colors " +
          (naConfiguracao
            ? "border-brand-600 font-semibold text-brand-700"
            : "border-transparent text-gray-400 hover:text-gray-700")
        }
      >
        Configuração
      </Link>
    </div>
  );
}
