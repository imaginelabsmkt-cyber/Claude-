/**
 * Qual aba do financeiro acende em cada tela.
 *
 * Função PURA, separada do componente, porque é exatamente o tipo de
 * regra que quebra calada. A Fran: "às vezes a gente tá numa aba e a
 * gente vai pra outra aba e aí não tem, essa aba não existe, eu acho
 * bem confuso o financeiro". Era isto: o formulário de um lançamento
 * não casava com nenhuma chave do mapa, nenhuma aba acendia, e a
 * barra inteira ficava apagada, como se ela tivesse saído do
 * financeiro sem ter ido a lugar nenhum.
 */

/**
 * As abas, na ordem em que aparecem.
 *
 * Eram quatro. "Ano" e "Relatórios" viraram uma só, "Resumo": as
 * duas respondiam a mesma pergunta em dois lugares, o ano inteiro e
 * os recortes do ano, e Relatórios era só uma lista de quatro links.
 *
 * "Fixos e ferramentas" virou "Contas fixas". O nome velho dizia o
 * que tem dentro; o novo diz o que é.
 *
 * "Estimativa" entrou depois, a pedido da Fran: é a única aqui que
 * não mostra o que aconteceu, e sim o que aconteceria se um cliente
 * do funil fechasse. Fica entre as contas fixas e o resumo porque é
 * a ponte entre as duas, o que sai todo mês de um lado, quanto
 * precisa entrar do outro.
 *
 * "Metas" chegou a ser aba aqui e saiu: virou área própria, porque
 * olhar para a frente não é assunto só do financeiro. O endereço
 * antigo redireciona.
 */
export const ABAS_FINANCEIRO = [
  { href: "/interno/financeiro", label: "Este mês" },
  { href: "/interno/financeiro/recorrencias", label: "Contas fixas" },
  { href: "/interno/financeiro/estimativa", label: "Estimativa" },
  { href: "/interno/financeiro/resumo-anual", label: "Resumo" },
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
  "/interno/relatorio": "/interno/financeiro/resumo-anual",
  "/interno/financeiro/impostos": "/interno/financeiro/resumo-anual",
  "/interno/financeiro/fluxo-caixa": "/interno/financeiro/resumo-anual",
  "/interno/financeiro/rentabilidade": "/interno/financeiro/resumo-anual",
  /* "Relatórios" deixou de ser aba e virou uma seção do Resumo. O
     endereço continua respondendo (redireciona) porque pode estar
     salvo no navegador de alguma das duas. */
  "/interno/financeiro/relatorios": "/interno/financeiro/resumo-anual",
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
