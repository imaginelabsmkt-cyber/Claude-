"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Abas do financeiro. CINCO, e cada uma responde o que nenhuma outra
 * responde.
 *
 * Eram oito, e a Fran disse que o financeiro estava confuso. Pela régua
 * que ela mesma deu ("faz sentido se cada coisa tiver sua função"),
 * três estavam respondendo o que outra já respondia:
 *
 *   Resumo anual      = o Mês, vezes doze. Virou link no Caixa.
 *   Impostos          = Lançamentos filtrado por duas categorias.
 *   Relatório do mês  = o Mês, formatado para imprimir.
 *
 * As três continuam existindo, e viraram link de onde elas pertencem.
 * O que saiu foi a disputa por atenção no topo da tela.
 *
 * "Categorias e saldo inicial" também não entra: é configuração que se
 * mexe uma vez. Fica no link discreto da direita.
 */
const ABAS = [
  { href: "/interno/financeiro", label: "Mês" },
  { href: "/interno/financeiro/recorrencias", label: "Fixos e ferramentas" },
  { href: "/interno/financeiro/fluxo-caixa", label: "Caixa" },
  { href: "/interno/financeiro/rentabilidade", label: "Por cliente" },
];

const CONFIGURACAO = "/interno/financeiro/categorias";

/**
 * As telas que saíram do topo continuam acendendo a aba de onde
 * vieram, senão a pessoa abre uma delas e a barra inteira fica apagada,
 * como se ela tivesse saído do financeiro.
 */
const PERTENCE_A: Record<string, string> = {
  "/interno/relatorio": "/interno/financeiro",
  "/interno/financeiro/impostos": "/interno/financeiro",
  "/interno/financeiro/lancamentos": "/interno/financeiro",
  "/interno/financeiro/resumo-anual": "/interno/financeiro/fluxo-caixa",
};

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
        const herdada = PERTENCE_A[pathname];
        const ativa = herdada
          ? herdada === aba.href
          : aba.href === "/interno/financeiro"
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
