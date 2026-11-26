import type { Premissas } from "@/lib/metas/projecao";
import type { ContaFixa } from "@/lib/metas/custo-fixo";
import type { FunilParaMetas } from "@/lib/metas/funil";

/**
 * As premissas que o sistema SABE, e que ninguém devia digitar.
 *
 * A Fran: "as premissas, eu também já quero que seja automático."
 *
 * Tinha treze campos na tela. Seis deles o sistema já sabia e estava
 * perguntando assim mesmo, o que é pior do que não ter o campo: a
 * pessoa digita um número, o sistema tem outro, e os dois convivem
 * até alguém reparar.
 *
 * Agora cada premissa tem uma ORIGEM:
 *
 *   calculada   sai de outra tela, e não se digita
 *   decisão     é escolha das duas, e só essas ficam editáveis
 *
 * Funções puras. Quem lê o banco é a camada de dados.
 */

export type Origem =
  | "carteira"
  | "contas fixas"
  | "financeiro"
  | "funil"
  | "decisão";

export interface PremissaCalculada {
  valor: number;
  origem: Origem;
  /** Onde ir para mudar. */
  comoMudar: string;
}

/**
 * O DAS do MEI.
 *
 * A projeção precisa dele para TIRAR do custo quando a agência sair
 * do MEI: o imposto novo entra no lugar dele, não em cima. Era um
 * campo digitado (R$ 86,05) que envelhece sozinho toda vez que o
 * salário mínimo muda.
 *
 * Procura em dois lugares, nesta ordem:
 *
 *   1. o último DAS LANÇADO no financeiro, que é o valor que saiu
 *      da conta de verdade no mês passado;
 *   2. uma conta fixa cuja descrição COMEÇA com "DAS".
 *
 * Começa com, e não contém: a primeira versão aceitava qualquer
 * descrição com a palavra no meio, e numa conta chamada "Ferramentas
 * e DAS do MEI" ela leu R$ 1.055,32 como se fosse o imposto. Um
 * número doze vezes maior entrando calado na projeção é pior do que
 * um campo em branco.
 */
export function dasDoMeiDasContas(contas: ContaFixa[]): number | null {
  const das = contas.find(
    (c) =>
      c.kind === "Despesa" &&
      c.active &&
      /^\s*das\b/i.test(
        (c as ContaFixa & { description?: string }).description ?? "",
      ),
  );
  return das ? das.amount : null;
}

/**
 * O ticket do cliente novo, pela média do funil.
 *
 * É o palpite menos ruim e o mais honesto: o valor que a agência
 * está pedindo HOJE, nas oportunidades que estão em cima da mesa.
 * Um número digitado meses atrás continua parecendo certo.
 *
 * Sem funil, cai no valor guardado.
 */
export function ticketPeloFunil(
  funil: FunilParaMetas,
  guardado: number,
): PremissaCalculada {
  if (funil.ticketMedio != null && funil.ticketMedio > 0) {
    return {
      valor: funil.ticketMedio,
      origem: "funil",
      comoMudar: "muda com o valor estimado das oportunidades",
    };
  }
  return {
    valor: guardado,
    origem: "decisão",
    comoMudar: "sem oportunidade no funil, usa o valor guardado",
  };
}

/**
 * Vídeos por cliente novo, pela média dos contratos de hoje.
 *
 * A agência vende mais ou menos a mesma coisa; o contrato novo se
 * parece com os que já existem. Quando os contratos mudarem, este
 * número muda junto.
 */
export function videosPorClientePelaCarteira(
  videosDeHoje: number,
  clientesComVideos: number,
  guardado: number,
): PremissaCalculada {
  if (clientesComVideos > 0 && videosDeHoje > 0) {
    return {
      valor: videosDeHoje / clientesComVideos,
      origem: "carteira",
      comoMudar: "média dos contratos que têm o número de vídeos",
    };
  }
  return {
    valor: guardado,
    origem: "decisão",
    comoMudar: "nenhum contrato tem o número de vídeos ainda",
  };
}

export interface PremissasAutomaticas {
  ticketNovo: PremissaCalculada;
  videosPorCliente: PremissaCalculada;
  dasDoMei: PremissaCalculada;
}

/**
 * Junta as três que o sistema sabe, e devolve as premissas prontas
 * para a projeção usar.
 *
 * O que não está aqui continua sendo decisão das duas: quanto
 * guardar, a meta, quando sair do MEI e quanto custa, o imposto de
 * fora do MEI e os encargos.
 */
export function premissasAutomaticas(
  guardadas: Premissas,
  funil: FunilParaMetas,
  contas: ContaFixa[],
  videosDeHoje: number,
  clientesComVideos: number,
  /** O último DAS que saiu da conta, quando houver. */
  ultimoDasPago: number | null = null,
): { premissas: Premissas; calculadas: PremissasAutomaticas } {
  const ticket = ticketPeloFunil(funil, guardadas.ticketNovo);
  const videos = videosPorClientePelaCarteira(
    videosDeHoje,
    clientesComVideos,
    guardadas.videosPorCliente,
  );
  const naConta = dasDoMeiDasContas(contas);
  const dasCalc: PremissaCalculada =
    ultimoDasPago != null
      ? {
          valor: ultimoDasPago,
          origem: "financeiro",
          comoMudar: "é o último DAS que saiu da conta",
        }
      : naConta != null
        ? {
            valor: naConta,
            origem: "contas fixas",
            comoMudar: "é a conta fixa do DAS",
          }
        : {
            valor: guardadas.dasDoMei,
            origem: "decisão",
            comoMudar: "não achei o DAS no financeiro",
          };

  return {
    premissas: {
      ...guardadas,
      ticketNovo: ticket.valor,
      videosPorCliente: videos.valor,
      dasDoMei: dasCalc.valor,
    },
    calculadas: {
      ticketNovo: ticket,
      videosPorCliente: videos,
      dasDoMei: dasCalc,
    },
  };
}
