/**
 * A estimativa de faturamento.
 *
 * A Fran: "uma estimativa do que, se a gente pegar mais tantos
 * clientes, quanto que fica o nosso faturamento mensal (...) vai ter
 * todos os nossos clientes, mais os clientes que a gente vai
 * adicionar. Tipo a mesma coisa que tá lá no mensal, só que aí a
 * gente faz a estimativa, e aí daria o total, e a gente tem uma
 * previsão."
 *
 * Então: a carteira de hoje, linha por linha, mais as linhas que ela
 * inventa, e o total embaixo. Aqui mora só a CONTA; a tela é de quem
 * desenha, e o que ela inventar fica guardado no navegador dela.
 *
 * Nada disso toca o banco. É rascunho: serve para responder "e se",
 * não para registrar o que aconteceu.
 */

export interface LinhaDaEstimativa {
  id: string;
  nome: string;
  mensal: number;
  /** Entra na conta. Desmarcar simula perder o cliente. */
  dentro: boolean;
  /** `true` quando é um cliente imaginado, não um da carteira. */
  imaginado?: boolean;
}

export interface Estimativa {
  /** Quantos clientes entram na conta. */
  quantos: number;
  /** Receita mensal estimada. */
  receita: number;
  /** O que sai todo mês, de verdade. */
  custoFixo: number;
  /** Receita menos custo fixo. Negativo quando não cobre. */
  sobra: number;
  /** Mensalidade média das linhas que entram na conta. */
  ticketMedio: number;
  /**
   * Quantos clientes A MAIS, no ticket médio, para cobrir o fixo.
   *
   * `0` quando já cobre. `null` quando não há ticket médio de onde
   * tirar a conta — não dá para dividir por zero e dizer que faltam
   * "infinitos clientes".
   */
  faltamClientes: number | null;
  /** Quanto a receita cresce contra a carteira de hoje, em fração. */
  variacao: number | null;
}

/**
 * Soma a estimativa.
 *
 * `receitaDeHoje` é a carteira real, para a variação: sem ela, "R$
 * 21.000" não diz se é muito ou pouco.
 */
export function calcularEstimativa(
  linhas: LinhaDaEstimativa[],
  custoFixo: number,
  receitaDeHoje: number,
): Estimativa {
  const dentro = linhas.filter((l) => l.dentro && l.mensal > 0);
  const receita = dentro.reduce((t, l) => t + l.mensal, 0);
  const ticketMedio = dentro.length ? receita / dentro.length : 0;
  const sobra = receita - custoFixo;

  return {
    quantos: dentro.length,
    receita,
    custoFixo,
    sobra,
    ticketMedio,
    faltamClientes:
      sobra >= 0 ? 0 : ticketMedio > 0 ? Math.ceil(-sobra / ticketMedio) : null,
    variacao:
      receitaDeHoje > 0 ? (receita - receitaDeHoje) / receitaDeHoje : null,
  };
}

/**
 * Uma linha nova, já com o ticket médio preenchido.
 *
 * O valor vem do ticket médio porque é o palpite menos ruim: a
 * pergunta dela é "mais tantos clientes", não "um cliente de quanto".
 * Arredonda para a dezena para não nascer com centavo de divisão.
 */
export function clienteImaginado(
  ticketMedio: number,
  numero: number,
): LinhaDaEstimativa {
  return {
    id: `novo-${numero}`,
    nome: `Cliente novo ${numero}`,
    mensal: ticketMedio > 0 ? Math.round(ticketMedio / 10) * 10 : 0,
    dentro: true,
    imaginado: true,
  };
}
