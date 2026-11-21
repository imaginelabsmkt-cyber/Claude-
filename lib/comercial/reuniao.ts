/**
 * A data da reunião, escrita como a Fran lê.
 *
 * Funções PURAS: recebem o instante e o "agora", devolvem texto. Sem
 * `new Date()` escondido lá dentro, que é o que faz teste de data
 * passar hoje e falhar amanhã.
 */

const DIAS = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];

const MES_CURTO = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/** Meia-noite do dia de uma data, no fuso de quem está olhando. */
function diaDe(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Dias inteiros entre dois instantes, ignorando a hora. */
export function diasAte(quando: Date, agora: Date): number {
  return Math.round(
    (diaDe(quando).getTime() - diaDe(agora).getTime()) / 86_400_000,
  );
}

/** A hora, só quando não é meia-noite em ponto. */
function hora(d: Date): string {
  if (d.getHours() === 0 && d.getMinutes() === 0) return "";
  const m = d.getMinutes();
  return ` ${d.getHours()}${m ? `h${String(m).padStart(2, "0")}` : "h"}`;
}

/**
 * "hoje 14h", "amanhã 9h30", "quinta 16h", "25/nov", "foi há 3 dias".
 *
 * Perto, a palavra; longe, a data. Dizer "25/nov" para uma reunião que
 * é daqui a duas horas não ajuda ninguém a se organizar, e dizer
 * "daqui a 46 dias" obriga a pessoa a abrir o calendário.
 */
export function quandoEhAReuniao(iso: string, agora: Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const dias = diasAte(d, agora);

  if (dias === 0) return `hoje${hora(d)}`;
  if (dias === 1) return `amanhã${hora(d)}`;
  if (dias === -1) return "foi ontem";
  if (dias < -1) return `foi há ${Math.abs(dias)} dias`;
  // Dentro da semana, o dia da semana diz mais que o número.
  if (dias <= 6) return `${DIAS[d.getDay()]}${hora(d)}`;

  return `${d.getDate()}/${MES_CURTO[d.getMonth()]}`;
}

/** A reunião já passou e ninguém mexeu na oportunidade? */
export function reuniaoPassou(iso: string | null, agora: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < agora.getTime();
}

/**
 * O valor para o `<input type="datetime-local">`: "YYYY-MM-DDTHH:mm"
 * no fuso de quem está olhando, porque é assim que o campo lê.
 */
export function paraCampoDeReuniao(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
