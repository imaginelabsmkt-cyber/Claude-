/**
 * A data da reunião, escrita como a Fran lê.
 *
 * TUDO AQUI ACONTECE NO FUSO DE BOA VISTA, igual ao resto do sistema
 * (ver `hojeISO` em lib/financeiro/meses.ts). Dois motivos:
 *
 *   1. A agência inteira vive num fuso só. "Reunião quinta 16h" é 16h
 *      em Boa Vista, não no relógio de quem abriu a tela.
 *   2. Servidor e navegador escrevem a MESMA frase. Quando isto
 *      dependia do relógio de quem olha, o HTML do servidor (que roda
 *      em UTC) dizia uma coisa e o do navegador outra, e a única saída
 *      era esconder a coluna até a tela montar, o que deixava a
 *      informação mais útil da lista aparecendo um quadro depois.
 *
 * Boa Vista é UTC-4 o ano inteiro: Roraima não tem horário de verão.
 * É o que torna a conversão de ida e volta exata, sem tabela de fuso.
 *
 * Funções PURAS: recebem o instante e o "agora". Sem `new Date()`
 * escondido lá dentro, que é o que faz teste de data passar hoje e
 * falhar amanhã.
 */

const FUSO = "America/Boa_Vista";
/** Deslocamento fixo de Boa Vista. Sem horário de verão em Roraima. */
const OFFSET = "-04:00";

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

const FORMATO = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

interface Partes {
  ano: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
}

/** As partes de um instante, lidas no fuso da agência. */
function partes(d: Date): Partes {
  const p = Object.fromEntries(
    FORMATO.formatToParts(d).map((x) => [x.type, x.value]),
  );
  return {
    ano: Number(p.year),
    mes: Number(p.month),
    dia: Number(p.day),
    // Meia-noite sai como "24" em alguns ambientes com hour12:false.
    hora: Number(p.hour) % 24,
    minuto: Number(p.minute),
  };
}

/** O dia, como número de dias desde a época, para subtrair. */
function diaSerial(p: Partes): number {
  return Date.UTC(p.ano, p.mes - 1, p.dia) / 86_400_000;
}

/** Dias inteiros entre dois instantes, ignorando a hora. */
export function diasAte(quando: Date, agora: Date): number {
  return diaSerial(partes(quando)) - diaSerial(partes(agora));
}

/** A hora, só quando não é meia-noite em ponto. */
function hora(p: Partes): string {
  if (p.hora === 0 && p.minuto === 0) return "";
  return ` ${p.hora}${p.minuto ? `h${String(p.minuto).padStart(2, "0")}` : "h"}`;
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

  const p = partes(d);
  const dias = diasAte(d, agora);

  if (dias === 0) return `hoje${hora(p)}`;
  if (dias === 1) return `amanhã${hora(p)}`;
  if (dias === -1) return "foi ontem";
  if (dias < -1) return `foi há ${Math.abs(dias)} dias`;
  // Dentro da semana, o dia da semana diz mais que o número.
  if (dias <= 6) {
    const semana = new Date(Date.UTC(p.ano, p.mes - 1, p.dia)).getUTCDay();
    return `${DIAS[semana]}${hora(p)}`;
  }

  return `${p.dia}/${MES_CURTO[p.mes - 1]}`;
}

/** "28/out", a data miúda, no fuso da agência. */
export function dataCurta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = partes(d);
  return `${p.dia}/${MES_CURTO[p.mes - 1]}`;
}

/** A reunião já passou? Comparação de instantes: não depende de fuso. */
export function reuniaoPassou(iso: string | null, agora: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < agora.getTime();
}

/**
 * O valor para o `<input type="datetime-local">`: "YYYY-MM-DDTHH:mm"
 * em Boa Vista, porque é assim que o campo lê.
 */
export function paraCampoDeReuniao(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = partes(d);
  const z = (n: number) => String(n).padStart(2, "0");
  return `${p.ano}-${z(p.mes)}-${z(p.dia)}T${z(p.hora)}:${z(p.minuto)}`;
}

/**
 * O caminho de volta: o que o campo devolve vira instante.
 *
 * "2026-11-12T16:05" não tem fuso nenhum. Quem o lê sem dizer nada
 * assume o relógio da máquina, e a máquina que grava é o servidor,
 * em UTC, o que transformaria as 16h de Boa Vista em 12h. Aqui o fuso
 * é dito, e dito uma vez só.
 */
export function instanteDaReuniao(local: string | null | undefined): string | null {
  const t = (local ?? "").trim();
  if (!t) return null;
  /* O formato é conferido ANTES de montar a data. `new Date()` é
     leniente de um jeito perigoso: "ontem de tarde:00-04:00" não dá
     erro, dá 1º de janeiro de 2000, uma reunião marcada para 26 anos
     atrás, gravada sem ninguém notar. */
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t)) return null;
  const d = new Date(`${t}:00${OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
