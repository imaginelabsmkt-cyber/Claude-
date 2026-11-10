/**
 * Helpers de mês de competência ("YYYY-MM").
 *
 * O financeiro é organizado por MÊS (como as abas da planilha), então o
 * mês é a chave de tudo: filtros, encadeamento de saldo e resumo anual.
 * Tudo aqui é manipulação de string — nunca `new Date()` sobre "YYYY-MM",
 * que introduziria fuso horário e erraria a virada do mês.
 */

const NOMES_MES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const NOMES_CURTOS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const FORMATO = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Verifica se a string está no formato "YYYY-MM" com mês válido. */
export function mesValido(mes: string): boolean {
  return FORMATO.test(mes);
}

/** Quebra "2026-04" em { ano: 2026, mes: 4 }. */
export function partesMes(mes: string): { ano: number; mes: number } {
  const m = FORMATO.exec(mes);
  if (!m) return { ano: 0, mes: 0 };
  return { ano: Number(m[1]), mes: Number(m[2]) };
}

/** Monta "YYYY-MM" a partir de ano e mês (1-12), normalizando o excedente. */
export function montarMes(ano: number, mes: number): string {
  const anoAjustado = ano + Math.floor((mes - 1) / 12);
  const mesAjustado = ((((mes - 1) % 12) + 12) % 12) + 1;
  return `${anoAjustado}-${String(mesAjustado).padStart(2, "0")}`;
}

/**
 * Mês de competência atual.
 *
 * Usa o fuso de Boa Vista, e não o do servidor: a Vercel roda em UTC, e
 * no dia 1 de cada mês, até as 20h daqui, o servidor ainda estaria no
 * mês anterior.
 */
export function mesAtual(): string {
  return mesDeHoje();
}

/** Desloca um mês em N posições (N negativo volta no tempo). */
export function deslocarMes(mes: string, passos: number): string {
  const { ano, mes: m } = partesMes(mes);
  if (!ano) return mes;
  return montarMes(ano, m + passos);
}

/** Mês anterior ("2026-04" -> "2026-03"). */
export function mesAnterior(mes: string): string {
  return deslocarMes(mes, -1);
}

/** Próximo mês ("2026-12" -> "2027-01"). */
export function proximoMes(mes: string): string {
  return deslocarMes(mes, 1);
}

/** Rótulo curto para cabeçalhos de tabela ("2026-04" -> "Abr/26"). */
export function rotuloMesCurto(mes: string): string {
  const { ano, mes: m } = partesMes(mes);
  if (!ano) return mes;
  return `${NOMES_CURTOS[m - 1]}/${String(ano).slice(-2)}`;
}

/** Rótulo por extenso ("2026-04" -> "Abril/2026"). */
export function rotuloMes(mes: string): string {
  const { ano, mes: m } = partesMes(mes);
  if (!ano) return mes;
  return `${NOMES_MES[m - 1]}/${ano}`;
}

/**
 * Sequência de meses de `inicio` até `fim` (ambos inclusive).
 * Devolve [] quando o intervalo é inválido ou invertido.
 */
export function intervaloMeses(inicio: string, fim: string): string[] {
  if (!mesValido(inicio) || !mesValido(fim) || inicio > fim) return [];
  const meses: string[] = [];
  let atual = inicio;
  // Trava de segurança: 20 anos de meses é muito mais do que qualquer uso real.
  while (atual <= fim && meses.length < 240) {
    meses.push(atual);
    atual = proximoMes(atual);
  }
  return meses;
}

/** Todos os meses de um ano civil ("2026-01" .. "2026-12"). */
export function mesesDoAno(ano: number): string[] {
  return intervaloMeses(`${ano}-01`, `${ano}-12`);
}

/** Ano civil do mês de competência. */
export function anoDoMes(mes: string): number {
  return partesMes(mes).ano || new Date().getFullYear();
}

/**
 * Data de vencimento de um lançamento, a partir do dia da recorrência.
 *
 * O VENCIMENTO CAI NO MÊS SEGUINTE ao da competência. É assim que a
 * Favie trabalha, nas palavras da Fran:
 *
 *   "as contas de outubro eu fecho em novembro, e assim sucessivamente"
 *
 * Então a mensalidade de OUTUBRO vence no dia tal de NOVEMBRO. O
 * sistema colocava o vencimento dentro do próprio mês da competência, e
 * por isso todas as datas apareciam erradas, e tudo parecia vencido um
 * mês antes da hora.
 *
 * Competência e vencimento são coisas diferentes: a competência diz a
 * que mês o dinheiro PERTENCE (e é ela que monta o fluxo de caixa); o
 * vencimento diz QUANDO ele é pago.
 *
 * NEM TODO MUNDO PAGA DEPOIS. O Studio Bambu paga ANTECIPADO: no dia
 * 25 de outubro ele paga novembro. Por isso `deslocamento`, em meses,
 * contado a partir da competência:
 *
 *    +1  paga no mês seguinte   (o normal aqui: Kiku, Malukies, o
 *        pró-labore, o cartão das ferramentas)
 *     0  paga dentro do próprio mês
 *    -1  paga ANTECIPADO, no mês anterior (Studio Bambu)
 *
 * Dias que não existem no mês (ex.: 31 em abril) caem no último dia.
 */
export function dataVencimento(
  mes: string,
  dia: number | null,
  deslocamento = 1,
): string | null {
  if (!dia) return null;
  const mesDoPagamento = deslocarMes(mes, deslocamento);
  const { ano, mes: m } = partesMes(mesDoPagamento);
  if (!ano) return null;
  const ultimoDia = new Date(ano, m, 0).getDate();
  const diaFinal = Math.min(Math.max(dia, 1), ultimoDia);
  return `${mesDoPagamento}-${String(diaFinal).padStart(2, "0")}`;
}

/**
 * Hoje, no fuso de Boa Vista, como "YYYY-MM-DD".
 *
 * `new Date().toISOString()` devolve a data em UTC, e Boa Vista é
 * UTC-4: das 20h à meia-noite daqui, o servidor já acha que é o dia
 * seguinte, e marca como vencido o que vence amanhã.
 */
export function hojeISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Boa_Vista",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Mês de competência atual, no fuso de Boa Vista. */
export function mesDeHoje(): string {
  return hojeISO().slice(0, 7);
}
