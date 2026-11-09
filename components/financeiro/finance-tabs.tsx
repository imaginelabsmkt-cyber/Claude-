"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Abas do financeiro. TRÊS: o MÊS, o que se REPETE e os RELATÓRIOS.
 *
 * Não inventei a forma: fui ver como os outros fazem, que é o que a
 * Fran vinha pedindo. Conta Azul, Nibo, Granatum, QuickBooks e Xero
 * divergem em quase tudo e concordam em três lugares — um PAINEL de
 * abertura, uma tela de MOVIMENTO e uma estante de RELATÓRIOS. E o
 * QuickBooks tem duas versões do mesmo menu: a "Accountant view",
 * com Sales e Expenses separados, e a "Business view", para quem não
 * é contador, que junta os dois numa aba só. A planilha da Fran é a
 * Business view: receitas e despesas na MESMA aba do mês.
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
 *
 * A terceira aba chamava "Caixa" e levava ao caixa mês a mês. A Fran:
 * "a gente tem o mensal, mas se eu quiser ver o anual eu não consigo,
 * aí tá no caixa, mas o caixa é caixa anual". E é isso mesmo: a
 * palavra "ano" não aparecia em lugar nenhum da barra, e o ano
 * inteiro — que na planilha dela é a aba Resumo Anual — ficava
 * escondido atrás de uma palavra que não é o nome dele.
 *
 * Ninguém tem uma aba chamada "Ano"; todo mundo tem "Relatórios", e
 * o resumo do ano é o primeiro item dentro dela. Aqui é igual: o ano,
 * o caixa mês a mês, o por cliente, os impostos e o fechamento para
 * imprimir moram lá dentro, cada um com a pergunta que responde.
 *
 * Cinco dessas telas não estavam em lugar nenhum antes: existiam, mas
 * só se chegava por um link no pé de outra tela. Nada foi apagado —
 * pelo contrário, agora dá para achar.
 */
const ABAS = [
  { href: "/interno/financeiro", label: "Mês" },
  { href: "/interno/financeiro/recorrencias", label: "Fixos e ferramentas" },
  { href: "/interno/financeiro/relatorios", label: "Relatórios" },
];

const CONFIGURACAO = "/interno/financeiro/categorias";

/**
 * As telas que saíram do topo continuam acendendo a aba de onde
 * vieram, senão a pessoa abre uma delas e a barra inteira fica apagada,
 * como se ela tivesse saído do financeiro.
 */
const PERTENCE_A: Record<string, string> = {
  "/interno/financeiro/lancamentos": "/interno/financeiro",
  "/interno/relatorio": "/interno/financeiro/relatorios",
  "/interno/financeiro/impostos": "/interno/financeiro/relatorios",
  "/interno/financeiro/resumo-anual": "/interno/financeiro/relatorios",
  "/interno/financeiro/fluxo-caixa": "/interno/financeiro/relatorios",
  "/interno/financeiro/rentabilidade": "/interno/financeiro/relatorios",
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
