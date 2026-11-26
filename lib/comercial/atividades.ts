/**
 * A fila de trabalho: o que precisa de você, em que ordem.
 *
 * Do raio-X do Zoho que a Vitória fez, sobre a tela de Fila de
 * trabalho: "é a tela que mais vale replicar primeiro. Ela responde
 * 'o que eu faço agora?' sem relatório nenhum." E sobre as listas:
 * "o vencimento aparece em linguagem simples ('Hoje', 'Ontem',
 * 'Atrasado em 2 dias'), com atrasos em vermelho."
 *
 * Funções PURAS. O "agora" entra por parâmetro, e as contas de dia são
 * feitas no fuso de Boa Vista, igual ao resto do sistema.
 */

import { diasAte } from "@/lib/comercial/reuniao";

/** O mínimo que uma atividade precisa ter para entrar na fila. */
export interface AtividadeNaFila {
  id: string;
  subject: string;
  kind: string;
  due_at: string | null;
  done_at: string | null;
}

/**
 * Em que pé está uma atividade.
 *
 * "Sem prazo" não é atraso nem urgência: é uma anotação que alguém
 * fez e não marcou dia. Misturar com o que venceu é o jeito mais
 * rápido de fazer a pessoa parar de olhar a lista.
 */
export type Momento = "atrasada" | "hoje" | "proxima" | "sem prazo" | "feita";

export function momentoDaAtividade(
  a: Pick<AtividadeNaFila, "due_at" | "done_at">,
  agora: Date,
): Momento {
  if (a.done_at) return "feita";
  if (!a.due_at) return "sem prazo";

  const d = new Date(a.due_at);
  if (Number.isNaN(d.getTime())) return "sem prazo";

  const dias = diasAte(d, agora);
  if (dias < 0) return "atrasada";
  if (dias === 0) return "hoje";
  return "proxima";
}

/**
 * "hoje", "ontem", "há 2 dias", "em 3 dias", "25/nov".
 *
 * NEUTRO de propósito: quem chama é que sabe se aquilo venceu ou se
 * foi feito, e põe a palavra na frente ("venceu ontem", "feita há 2
 * dias"). A função dizia "atrasada há 2 dias" sempre, e aí uma
 * atividade CONCLUÍDA aparecia como atrasada, alarme por uma coisa
 * que já tinha acontecido.
 */
const MES_CURTO = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export function prazoEmPalavras(
  due: string | null,
  agora: Date,
): string {
  if (!due) return "sem prazo";
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return "sem prazo";

  const dias = diasAte(d, agora);
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  if (dias === -1) return "ontem";
  if (dias < -1) return `há ${Math.abs(dias)} dias`;
  if (dias <= 6) return `em ${dias} dias`;

  // Longe: a data, lida no mesmo fuso do resto.
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Boa_Vista",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const [, mes, dia] = p.split("-");
  return `${Number(dia)}/${MES_CURTO[Number(mes) - 1]}`;
}

export interface FilaDeTrabalho<T> {
  atrasadas: T[];
  hoje: T[];
  proximas: T[];
  semPrazo: T[];
}

/**
 * Separa as atividades abertas em atrasadas, de hoje, próximas e sem
 * prazo, nessa ordem, que é a ordem em que elas pedem atenção.
 *
 * Dentro de cada grupo, a mais antiga primeiro: o que venceu há mais
 * tempo é o que está apodrecendo há mais tempo.
 */
export function montarFila<T extends AtividadeNaFila>(
  atividades: T[],
  agora: Date,
): FilaDeTrabalho<T> {
  const fila: FilaDeTrabalho<T> = {
    atrasadas: [],
    hoje: [],
    proximas: [],
    semPrazo: [],
  };

  for (const a of atividades) {
    switch (momentoDaAtividade(a, agora)) {
      case "atrasada":
        fila.atrasadas.push(a);
        break;
      case "hoje":
        fila.hoje.push(a);
        break;
      case "proxima":
        fila.proximas.push(a);
        break;
      case "sem prazo":
        fila.semPrazo.push(a);
        break;
      default:
        break; // feita não entra na fila
    }
  }

  const porPrazo = (a: T, b: T) =>
    (a.due_at ?? "").localeCompare(b.due_at ?? "");
  fila.atrasadas.sort(porPrazo);
  fila.hoje.sort(porPrazo);
  fila.proximas.sort(porPrazo);

  return fila;
}

/** Quantas estão pedindo atenção AGORA (atrasadas + de hoje). */
export function pedemAtencao(fila: FilaDeTrabalho<unknown>): number {
  return fila.atrasadas.length + fila.hoje.length;
}
