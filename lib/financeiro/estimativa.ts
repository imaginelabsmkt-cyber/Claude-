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
 * E depois, vendo a primeira versão: "QUERO QUE SEJA DE ACORDO COM O
 * QUE ESTAMOS PROSPECTANDO NO COMERCIAL."
 *
 * Isso muda a origem das linhas. Eu tinha posto um "+ Cliente novo"
 * que nascia do nada, com o ticket médio — um boneco. Mas a agência
 * não prospecta bonecos: tem nome, etapa e valor estimado no funil,
 * tudo já cadastrado. Então as linhas que ela acrescenta são AS
 * OPORTUNIDADES DE VERDADE, e marcar uma quer dizer "supondo que
 * esta feche".
 *
 * Aqui mora só a CONTA; a tela é de quem desenha, e o que ela marcar
 * fica guardado no navegador dela.
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
  /** De onde a linha veio. */
  origem: Origem;
  /** Etapa do funil, só para quem está em prospecção. */
  etapa?: string | null;
  /** Temperatura do lead, só para quem está em prospecção. */
  temperatura?: string | null;
}

/**
 * De onde cada linha vem.
 *
 *   carteira    cliente de hoje, com mensalidade no sistema
 *   prospeccao  oportunidade aberta no funil comercial
 *   imaginado   linha que a pessoa escreveu à mão
 */
export type Origem = "carteira" | "prospeccao" | "imaginado";

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
  /** Quanto vem de oportunidade do funil, e não de cliente de hoje. */
  dePropeccao: number;
  /** Quantas oportunidades do funil entram na conta. */
  quantasEmProspeccao: number;
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

  const prospeccao = dentro.filter((l) => l.origem === "prospeccao");

  return {
    quantos: dentro.length,
    receita,
    custoFixo,
    sobra,
    ticketMedio,
    dePropeccao: prospeccao.reduce((t, l) => t + l.mensal, 0),
    quantasEmProspeccao: prospeccao.length,
    faltamClientes:
      sobra >= 0 ? 0 : ticketMedio > 0 ? Math.ceil(-sobra / ticketMedio) : null,
    variacao:
      receitaDeHoje > 0 ? (receita - receitaDeHoje) / receitaDeHoje : null,
  };
}

/**
 * Uma linha escrita à mão, já com o ticket médio preenchido.
 *
 * Continua existindo para o caso de "e se a gente pegar mais dois,
 * além do que está no funil". É a exceção; a regra é marcar
 * oportunidade de verdade.
 *
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
    origem: "imaginado",
  };
}
