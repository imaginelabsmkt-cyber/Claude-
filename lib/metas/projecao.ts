/**
 * A projeção da Favie, mês a mês.
 *
 * Vem da planilha que a Fran montou ("Projeção FAVIE: editor, CS e
 * meta de 50 mil"), com uma diferença que foi o pedido dela: "eu
 * quero que tudo se integre, o financeiro, o administrativo, tudo se
 * integre."
 *
 * Na planilha, a carteira, o faturamento e o custo fixo eram digitados
 * à mão e envelheciam no dia seguinte. Aqui eles ENTRAM do sistema:
 *
 *   clientes de hoje, faturamento recorrente  ->  carteira
 *   custo fixo                                ->  contas fixas
 *
 * O que fica guardado é só o PALPITE: quanto custa um editor, quando
 * entra a CS, quanto se quer guardar por mês.
 *
 * Aqui mora só a CONTA. Função pura: mesmos números entram, mesmos
 * números saem, e dá para conferir contra a planilha linha por linha.
 */

export interface Premissas {
  ticketNovo: number;
  videosPorCliente: number;
  videosDoEditor: number;
  precoPorVideo: number;
  impostoFixo: number;
  contadorMensal: number;
  dasDoMei: number;
  impostoPercentual: number;
  custoSaidaDoMei: number;
  /** "YYYY-MM" */
  mesSaidaDoMei: string;
  encargosClt: number;
  guardarPorMes: number;
  metaGuardada: number;
  /** "YYYY-MM" */
  mesDaMeta: string;
  clientesNaProjecao: number;
}

/**
 * Como cada pessoa é paga. Cinco formas, e elas mudam a conta de
 * jeitos diferentes.
 *
 * GRAVADO E EDITADO SÃO CONTAS SEPARADAS: videomaker grava, editor
 * edita, e o mesmo vídeo passa pelos dois. Na primeira versão eu
 * tinha os dois como "por vídeo" e a conta pagaria duas vezes pela
 * mesma coisa.
 */
export type FormaDePagamento =
  | "mensal"
  | "por_video_editado"
  | "por_video_gravado"
  | "por_cliente"
  | "uma_vez";

export interface Contratacao {
  id: string;
  cargo: string;
  forma: FormaDePagamento;
  /**
   * Para "mensal" e "uma_vez": o valor.
   * `null` quer dizer "falta definir", e a projeção avisa.
   */
  custoMensal: number | null;
  /** Para as formas por unidade: quanto vale cada uma. */
  valorPorUnidade: number | null;
  /** Teto de unidades por mês. O que passar fica com as sócias. */
  tetoDeUnidades: number | null;
  /**
   * "YYYY-MM" do primeiro mês em que custa dinheiro.
   * Para "uma_vez", é o ÚNICO mês em que custa.
   */
  mesDeInicio: string;
  ativa: boolean;
  /** Encargos CLT por cima do salário. Por demanda: false. */
  clt: boolean;
}

/** Quantas unidades a pessoa cobra neste mês, pela forma dela. */
export function unidadesDoMes(
  c: Contratacao,
  videosNoMes: number,
  clientesNoMes: number,
): number {
  const bruto =
    c.forma === "por_cliente"
      ? clientesNoMes
      : c.forma === "por_video_editado" || c.forma === "por_video_gravado"
        ? videosNoMes
        : 0;
  return c.tetoDeUnidades != null ? Math.min(bruto, c.tetoDeUnidades) : bruto;
}

/** O que o sistema já sabe, e que a projeção não digita. */
export interface DoSistema {
  clientesAtivos: number;
  faturamentoRecorrente: number;
  /**
   * O custo fixo DE CADA MÊS, por "YYYY-MM".
   *
   * Não é um número só, e essa é a parte que a planilha não
   * conseguia fazer. Lá havia duas linhas digitadas à mão, "custo
   * fixo até fev/27" e "a partir de mar/27", porque a mentoria
   * Ultralize acaba em fevereiro, e uma fórmula tinha que saber
   * disso: IF(mês < março, 16.222,02, 14.055,32).
   *
   * Dois números e uma data, escritos à mão, que envelhecem na
   * primeira conta fixa que entrar ou sair.
   *
   * O sistema já sabe o mês de início e de fim de cada conta fixa.
   * Então aqui chega a soma de cada mês, calculada, e quando a Fran
   * cancelar uma assinatura em abril a projeção muda sozinha.
   */
  custoFixoPorMes: Record<string, number>;
  /** Para um mês que não esteja no mapa: o custo fixo de hoje. */
  custoFixoPadrao: number;
  /** Vídeos por mês nos contratos de hoje. */
  videosDeHoje: number;
}

export interface MesDaProjecao {
  /** "YYYY-MM" */
  mes: string;
  novosClientes: number;
  clientesNoTotal: number;
  faturamento: number;
  custoFixo: number;
  impostoEContador: number;
  saidaDoMei: number;
  /** Custo de cada contratação ativa neste mês, por id. */
  custoDasPessoas: Record<string, number>;
  totalDasPessoas: number;
  custoTotal: number;
  /** Faturamento menos custo. É o que dá para guardar. */
  sobra: number;
  guardadoAcumulado: number;
  videos: number;
  /** Vídeos que o editor edita neste mês. */
  videosComOEditor: number;
  /** Vídeos que o videomaker grava neste mês. */
  videosComOVideomaker: number;
  /** O que sobra para a Fran EDITAR. */
  videosComAFran: number;
  /** O que sobra para a Fran GRAVAR. */
  videosParaAFranGravar: number;
  /**
   * O imposto se fosse 6% do faturamento, em vez do valor fixo.
   *
   * A Fran estimou R$ 600 por mês. No Simples (Anexo III) a 1ª faixa
   * é 6% do faturamento, e com 20 clientes isso passa de R$ 2.300,
   * quatro vezes o palpite. É diferença que decide se a meta é
   * atingida ou não, então as duas contas ficam lado a lado em vez
   * de uma só, escolhida por mim.
   *
   * Zero antes de sair do MEI, quando o DAS é o imposto.
   */
  impostoPeloSimples: number;
  /** A sobra do mês se o imposto fosse o do Simples. */
  sobraPeloSimples: number;
}

export interface Projecao {
  meses: MesDaProjecao[];
  /** Quanto se junta até o mês da meta. */
  guardadoAteAMeta: number;
  /** Positivo: passou da meta. Negativo: falta. */
  diferencaParaAMeta: number;
  /** O mês em que o acumulado cruza a meta, se cruzar. */
  mesEmQueBate: string | null;
  /** Contratações ativas que ainda não têm valor. */
  semValor: Contratacao[];
  /** Faturamento mínimo no último mês para pagar tudo e guardar. */
  faturamentoMinimo: number;
  /** Quanto se junta até a meta, com o imposto do Simples. */
  guardadoPeloSimples: number;
}

/** Soma meses a um "YYYY-MM". */
export function somarMeses(mes: string, n: number): string {
  const [a, m] = mes.split("-").map(Number);
  const total = a * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** Quantos meses de `de` até `ate`. Negativo se `ate` vem antes. */
export function mesesEntre(de: string, ate: string): number {
  const [a1, m1] = de.split("-").map(Number);
  const [a2, m2] = ate.split("-").map(Number);
  return (a2 - a1) * 12 + (m2 - m1);
}

/**
 * Quanto uma contratação custa num mês.
 *
 * Antes do mês de início, zero. Sem valor definido, zero também, e
 * é por isso que `semValor` existe na projeção: a tela precisa dizer
 * que a conta está otimista, em vez de somar um palpite meu.
 */
export function custoDaPessoa(
  c: Contratacao,
  mes: string,
  p: Premissas,
  videosNoMes: number,
  clientesNoMes: number,
): number {
  if (!c.ativa) return 0;

  /* "uma_vez" custa num mês SÓ, e não de lá em diante: o advogado
     revisa os contratos uma vez e acabou. Somar todo mês inflaria o
     custo da projeção inteira. */
  if (c.forma === "uma_vez") {
    return mes === c.mesDeInicio ? (c.custoMensal ?? 0) : 0;
  }

  if (mesesEntre(c.mesDeInicio, mes) < 0) return 0;

  if (c.forma === "mensal") {
    if (c.custoMensal == null) return 0;
    return c.custoMensal * (c.clt ? 1 + p.encargosClt : 1);
  }

  /* Por unidade, com TETO. Sem o teto, a conta diria que a agência
     pode crescer para sempre com um editor só. */
  if (c.valorPorUnidade == null) return 0;
  return unidadesDoMes(c, videosNoMes, clientesNoMes) * c.valorPorUnidade;
}

/**
 * Monta a projeção.
 *
 * `ritmo` é quantos clientes novos entram em cada mês, por "YYYY-MM".
 * Os meses saem de `primeiroMes` até `mesDaMeta`, mesmo os que o
 * ritmo não menciona, um mês sem cliente novo continua tendo custo,
 * e sumir da tabela esconderia isso.
 */
export function montarProjecao(
  primeiroMes: string,
  premissas: Premissas,
  contratacoes: Contratacao[],
  ritmo: Record<string, number>,
  sistema: DoSistema,
): Projecao {
  const ate = Math.max(0, mesesEntre(primeiroMes, premissas.mesDaMeta));
  const meses: MesDaProjecao[] = [];

  let acumuladoDeClientes = 0;
  let guardado = 0;
  let guardadoPeloSimples = 0;
  let mesEmQueBate: string | null = null;

  for (let i = 0; i <= ate; i++) {
    const mes = somarMeses(primeiroMes, i);
    const novos = ritmo[mes] ?? 0;
    acumuladoDeClientes += novos;

    const clientesNoTotal = sistema.clientesAtivos + acumuladoDeClientes;
    const faturamento =
      sistema.faturamentoRecorrente + acumuladoDeClientes * premissas.ticketNovo;
    const videos =
      sistema.videosDeHoje + acumuladoDeClientes * premissas.videosPorCliente;

    /* O imposto muda quando a agência sai do MEI: no lugar do DAS,
       entra o imposto do Simples mais o contador. Antes disso, zero
       aqui, o DAS já está dentro do custo fixo. */
    const foraDoMei = mesesEntre(premissas.mesSaidaDoMei, mes) >= 0;
    const impostoEContador = foraDoMei
      ? premissas.impostoFixo + premissas.contadorMensal - premissas.dasDoMei
      : 0;
    const saidaDoMei = mes === premissas.mesSaidaDoMei ? premissas.custoSaidaDoMei : 0;

    const custoDasPessoas: Record<string, number> = {};
    let totalDasPessoas = 0;
    for (const c of contratacoes) {
      const v = custoDaPessoa(c, mes, premissas, videos, clientesNoTotal);
      custoDasPessoas[c.id] = v;
      totalDasPessoas += v;
    }

    /* Quantos vídeos sobram para a Fran EDITAR: o editor leva até o
       teto dele, e só a partir do mês em que ele entra. O teto sai da
       contratação, não das premissas: é um número que pertence a uma
       pessoa. */
    const emAtividade = (c: Contratacao) =>
      c.ativa && mesesEntre(c.mesDeInicio, mes) >= 0;

    const videosComOEditor = contratacoes
      .filter((c) => c.forma === "por_video_editado" && emAtividade(c))
      .reduce((t, c) => t + unidadesDoMes(c, videos, clientesNoTotal), 0);

    const videosComOVideomaker = contratacoes
      .filter((c) => c.forma === "por_video_gravado" && emAtividade(c))
      .reduce((t, c) => t + unidadesDoMes(c, videos, clientesNoTotal), 0);

    const custoFixo = sistema.custoFixoPorMes[mes] ?? sistema.custoFixoPadrao;
    const custoTotal =
      custoFixo + impostoEContador + saidaDoMei + totalDasPessoas;
    const sobra = faturamento - custoTotal;
    guardado += sobra;

    /* A outra conta do imposto, a do Simples. Entra junto com o
       imposto fixo, não no lugar dele: quem decide qual vale é o
       contador, e a tela mostra as duas. */
    const impostoPeloSimples = foraDoMei
      ? faturamento * premissas.impostoPercentual
      : 0;
    const sobraPeloSimples = foraDoMei
      ? sobra + premissas.impostoFixo - impostoPeloSimples
      : sobra;
    guardadoPeloSimples += sobraPeloSimples;

    if (mesEmQueBate == null && guardado >= premissas.metaGuardada) {
      mesEmQueBate = mes;
    }

    meses.push({
      mes,
      novosClientes: novos,
      clientesNoTotal,
      faturamento,
      custoFixo,
      impostoEContador,
      saidaDoMei,
      custoDasPessoas,
      totalDasPessoas,
      custoTotal,
      sobra,
      guardadoAcumulado: guardado,
      videos,
      videosComOEditor,
      videosComOVideomaker,
      videosComAFran: videos - videosComOEditor,
      videosParaAFranGravar: videos - videosComOVideomaker,
      impostoPeloSimples,
      sobraPeloSimples,
    });
  }

  const ultimo = meses[meses.length - 1];

  return {
    meses,
    guardadoAteAMeta: guardado,
    diferencaParaAMeta: guardado - premissas.metaGuardada,
    mesEmQueBate,
    semValor: contratacoes.filter(
      (c) =>
        c.ativa &&
        ((c.forma === "mensal" || c.forma === "uma_vez") &&
          c.custoMensal == null) ||
        (c.ativa &&
          c.forma !== "mensal" &&
          c.forma !== "uma_vez" &&
          c.valorPorUnidade == null),
    ),
    faturamentoMinimo: ultimo
      ? ultimo.custoTotal + premissas.guardarPorMes
      : premissas.guardarPorMes,
    guardadoPeloSimples,
  };
}

/**
 * Quantos clientes faltam, no ticket informado, para chegar a um
 * faturamento. Zero quando já chegou.
 */
export function clientesParaChegarA(
  alvo: number,
  faturamentoDeHoje: number,
  ticket: number,
): number | null {
  if (ticket <= 0) return null;
  return Math.ceil(Math.max(0, alvo - faturamentoDeHoje) / ticket);
}
