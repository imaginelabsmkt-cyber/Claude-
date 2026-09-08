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

/** Mês de competência atual, no fuso local. */
export function mesAtual(): string {
  const hoje = new Date();
  return montarMes(hoje.getFullYear(), hoje.getMonth() + 1);
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
 * Data de vencimento a partir do dia escolhido na recorrência.
 * Dias que não existem no mês (ex.: 31 em abril) caem no último dia.
 */
export function dataVencimento(mes: string, dia: number | null): string | null {
  if (!dia) return null;
  const { ano, mes: m } = partesMes(mes);
  if (!ano) return null;
  const ultimoDia = new Date(ano, m, 0).getDate();
  const diaFinal = Math.min(Math.max(dia, 1), ultimoDia);
  return `${mes}-${String(diaFinal).padStart(2, "0")}`;
}
