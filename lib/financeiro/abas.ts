/**
 * Qual aba do financeiro acende em cada tela.
 *
 * Função PURA, separada do componente, porque é exatamente o tipo de
 * regra que quebra calada. A Fran: "às vezes a gente tá numa aba e a
 * gente vai pra outra aba e aí não tem, essa aba não existe, eu acho
 * bem confuso o financeiro". Era isto: o formulário de um lançamento
 * não casava com nenhuma chave do mapa, nenhuma aba acendia, e a
 * barra inteira ficava apagada — como se ela tivesse saído do
 * financeiro sem ter ido a lugar nenhum.
 */

/** As quatro abas, na ordem em que aparecem. */
export const ABAS_FINANCEIRO = [
  { href: "/interno/financeiro", label: "Mês" },
  { href: "/interno/financeiro/recorrencias", label: "Fixos e ferramentas" },
  { href: "/interno/financeiro/resumo-anual", label: "Ano" },
  { href: "/interno/financeiro/relatorios", label: "Relatórios" },
] as const;

export const ABA_CONFIGURACAO = "/interno/financeiro/categorias";

/**
 * As telas que não são aba, e a aba de onde cada uma veio.
 *
 * Casa por PREFIXO: "/interno/financeiro/lancamentos/<id>/editar" é
 * filha de "/interno/financeiro/lancamentos", que é filha do Mês.
 */
const PERTENCE_A: Record<string, string> = {
  "/interno/financeiro/lancamentos": "/interno/financeiro",
  "/interno/relatorio": "/interno/financeiro/relatorios",
  "/interno/financeiro/impostos": "/interno/financeiro/relatorios",
  "/interno/financeiro/fluxo-caixa": "/interno/financeiro/relatorios",
  "/interno/financeiro/rentabilidade": "/interno/financeiro/relatorios",
};

/**
 * A aba acesa numa rota, ou `null` quando é a Configuração (que tem
 * o próprio lugar, no canto direito).
 *
 * Devolve o href da aba, não o rótulo: é o href que o componente
 * compara.
 */
export function abaAtiva(pathname: string): string | null {
  if (pathname === ABA_CONFIGURACAO || pathname.startsWith(`${ABA_CONFIGURACAO}/`)) {
    return null;
  }

  // O prefixo mais longo ganha, senão "/interno/financeiro" casaria
  // com tudo e o Mês acenderia em toda tela.
  let herdada: string | undefined;
  let tamanho = -1;
  for (const [rota, aba] of Object.entries(PERTENCE_A)) {
    if (
      (pathname === rota || pathname.startsWith(`${rota}/`)) &&
      rota.length > tamanho
    ) {
      herdada = aba;
      tamanho = rota.length;
    }
  }
  if (herdada) return herdada;

  for (const aba of ABAS_FINANCEIRO) {
    if (aba.href === "/interno/financeiro") {
      if (pathname === aba.href) return aba.href;
      continue;
    }
    if (pathname === aba.href || pathname.startsWith(`${aba.href}/`)) {
      return aba.href;
    }
  }

  return null;
}
