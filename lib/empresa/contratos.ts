/**
 * =============================================================
 * CONTRATOS DE CLIENTE
 * =============================================================
 * Regras puras do contrato. Sem banco, para poder ser testado.
 *
 * A pergunta que o contrato responde e a recorrência financeira não
 * respondia: **até quando este cliente é cliente, e quando eu preciso
 * conversar com ele de novo?**
 *
 * Duas conversas, e são diferentes:
 *   RENOVAÇÃO  o contrato acaba, e ou renova ou o cliente vai embora.
 *   REAJUSTE   o contrato continua, mas o valor precisa subir.
 *
 * Misturar as duas é o erro comum: um contrato de vigência
 * indeterminada nunca precisa renovar, mas precisa reajustar todo
 * ano. É por isso que cada uma tem a sua função aqui.
 * =============================================================
 */

export type SituacaoContrato =
  | "Vigente"
  | "Vence em breve"
  | "Vencido"
  | "Pausado"
  | "Encerrado";

/** O mínimo que um contrato precisa ter para estas contas. */
export interface ContratoBase {
  status: "Ativo" | "Pausado" | "Encerrado";
  start_date: string;
  end_date: string | null;
  readjust_index: string | null;
  last_readjust: string | null;
  monthly_amount: number;
}

/** Quantos dias faltam para o fim. Null quando não há fim combinado. */
export function diasAteOFim(
  contrato: ContratoBase,
  hoje: string,
): number | null {
  if (!contrato.end_date) return null;
  return diasEntre(hoje, contrato.end_date);
}

/**
 * Em que pé o contrato está.
 *
 * "Vence em breve" usa 45 dias porque é o tempo que dá para conversar
 * sem pressa: marcar a reunião, ouvir, ajustar escopo e assinar antes
 * de acabar. Avisar com uma semana é avisar tarde demais.
 */
export const DIAS_DE_AVISO = 45;

export function situacaoDoContrato(
  contrato: ContratoBase,
  hoje: string,
): SituacaoContrato {
  if (contrato.status === "Encerrado") return "Encerrado";
  if (contrato.status === "Pausado") return "Pausado";

  const dias = diasAteOFim(contrato, hoje);
  if (dias === null) return "Vigente";
  if (dias < 0) return "Vencido";
  if (dias <= DIAS_DE_AVISO) return "Vence em breve";
  return "Vigente";
}

/**
 * Quando cabe reajustar, se houver índice combinado.
 *
 * A conta é simples de propósito: doze meses depois do último
 * reajuste, ou do início se nunca houve. O sistema não calcula o
 * índice — quem faz isso é o IBGE, e inventar um número aqui seria
 * pior que não ter número nenhum. Ele só avisa que chegou a hora.
 */
export function proximoReajuste(contrato: ContratoBase): string | null {
  if (!contrato.readjust_index) return null;
  const base = contrato.last_readjust ?? contrato.start_date;
  return somarUmAno(base);
}

/** O reajuste já está na hora? */
export function reajusteVencido(
  contrato: ContratoBase,
  hoje: string,
): boolean {
  if (contrato.status !== "Ativo") return false;
  const quando = proximoReajuste(contrato);
  return quando !== null && quando <= hoje;
}

/** Quanto tempo o cliente já está na casa, em meses completos. */
export function mesesDeCasa(contrato: ContratoBase, hoje: string): number {
  const [ai, mi, di] = partes(contrato.start_date);
  const [af, mf, df] = partes(hoje);
  let meses = (af - ai) * 12 + (mf - mi);
  if (df < di) meses -= 1;
  return Math.max(meses, 0);
}

/**
 * Os contratos que pedem conversa, do mais urgente para o menos.
 *
 * Junta as duas conversas numa lista só porque, para quem usa, as
 * duas terminam no mesmo lugar: falar com o cliente. O motivo vem
 * junto para a conversa já começar certa.
 */
export interface Pendencia<T> {
  contrato: T;
  motivo: "Vencido" | "Vence em breve" | "Reajuste";
  /** Dias até o fim; negativo quando já passou. Null no reajuste. */
  dias: number | null;
}

export function contratosQuePedemConversa<T extends ContratoBase>(
  contratos: T[],
  hoje: string,
): Pendencia<T>[] {
  const saida: Pendencia<T>[] = [];

  for (const c of contratos) {
    const situacao = situacaoDoContrato(c, hoje);
    if (situacao === "Vencido" || situacao === "Vence em breve") {
      saida.push({ contrato: c, motivo: situacao, dias: diasAteOFim(c, hoje) });
      continue;
    }
    // Reajuste só entra quando a renovação não entrou: quem vai
    // renovar negocia o valor na mesma conversa.
    if (situacao === "Vigente" && reajusteVencido(c, hoje)) {
      saida.push({ contrato: c, motivo: "Reajuste", dias: null });
    }
  }

  const peso = { Vencido: 0, "Vence em breve": 1, Reajuste: 2 };
  return saida.sort(
    (a, b) =>
      peso[a.motivo] - peso[b.motivo] ||
      (a.dias ?? 9999) - (b.dias ?? 9999),
  );
}

/** Soma das mensalidades dos contratos ativos. */
export function receitaContratada(contratos: ContratoBase[]): number {
  const total = contratos
    .filter((c) => c.status === "Ativo")
    .reduce((t, c) => t + (Number(c.monthly_amount) || 0), 0);
  return Math.round((total + Number.EPSILON) * 100) / 100;
}

// -------------------------------------------------------------
// Datas em texto "YYYY-MM-DD", sem Date, pelo mesmo motivo de sempre:
// `new Date("2026-11-09")` é UTC, e no fuso de Boa Vista isso vira o
// dia 8. Contrato que vence "amanhã" apareceria vencendo "hoje".
// -------------------------------------------------------------

function partes(data: string): [number, number, number] {
  const [a, m, d] = data.split("-").map(Number);
  return [a, m, d];
}

/** Dias de `de` até `ate`. Negativo quando `ate` já passou. */
export function diasEntre(de: string, ate: string): number {
  const [a1, m1, d1] = partes(de);
  const [a2, m2, d2] = partes(ate);
  const um = Date.UTC(a1, m1 - 1, d1);
  const dois = Date.UTC(a2, m2 - 1, d2);
  return Math.round((dois - um) / 86400000);
}

/** Mesma data, um ano depois. 29/02 cai em 28/02 no ano comum. */
export function somarUmAno(data: string): string {
  const [a, m, d] = partes(data);
  const ano = a + 1;
  const ultimo = ultimoDia(ano, m);
  return `${ano}-${String(m).padStart(2, "0")}-${String(
    Math.min(d, ultimo),
  ).padStart(2, "0")}`;
}

function ultimoDia(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}
