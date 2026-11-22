import type { LeadChannel, LeadStage, LeadTemperature } from "@/types";

/**
 * A base do comercial: todo mundo que já passou por aqui.
 *
 * Do protótipo da Vitória, aba "Leads e clientes": uma lista só, com
 * quem está em negociação, quem virou cliente, quem deixou de ser e
 * quem não fechou. A Fran: "quando o cliente não fecha, ele vai
 * apenas para a nossa base de dados (...) e a gente vai tentar
 * entender essa métrica depois".
 *
 * Aqui mora só a REGRA (em que situação cada um está e o que passa
 * pelo filtro). O desenho é da página.
 */

/** As quatro situações possíveis, nas palavras do protótipo. */
export type Situacao =
  | "Em negociação"
  | "Cliente ativo"
  | "Ex-cliente"
  | "Não fechou";

export const SITUACOES: Situacao[] = [
  "Em negociação",
  "Cliente ativo",
  "Ex-cliente",
  "Não fechou",
];

/** O que a lista precisa saber de cada um. */
export interface DaBase {
  id: string;
  name: string;
  channel: LeadChannel | null;
  stage: LeadStage;
  temperature: LeadTemperature | null;
  next_contact_on: string | null;
  estimated_monthly: number;
  /** O cliente criado no fechamento, se existir. */
  client: { active: boolean } | null;
}

/**
 * Em que situação está.
 *
 * "Fechado" sozinho não basta: fechado com cliente ativo é cliente;
 * fechado com cliente desativado é ex-cliente, e ex-cliente é outra
 * conversa — volta a ser procurado depois, e some da carteira.
 */
export function situacaoDe(l: DaBase): Situacao {
  if (l.stage === "Perdido") return "Não fechou";
  if (l.stage === "Fechado") {
    return l.client && !l.client.active ? "Ex-cliente" : "Cliente ativo";
  }
  return "Em negociação";
}

/** O que escrever na coluna de situação: a etapa, quando em negociação. */
export function rotuloDaSituacao(l: DaBase): string {
  const s = situacaoDe(l);
  return s === "Em negociação" ? l.stage : s;
}

export interface Filtro {
  busca?: string | null;
  origem?: string | null;
  temperatura?: string | null;
  situacao?: string | null;
}

/** Tira acento e caixa, para "Hemilayne" achar "hemilayne". */
function simples(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Aplica os quatro filtros do protótipo.
 *
 * Filtro vazio não filtra: a tela abre com todo mundo, e cada campo
 * que a pessoa preenche só tira gente da lista. Filtro que não
 * corresponde a nada devolve lista vazia, não a lista inteira — o
 * contrário mente, dizendo que achou o que não achou.
 */
export function filtrar<T extends DaBase>(base: T[], f: Filtro): T[] {
  const q = simples(f.busca ?? "");
  return base.filter((l) => {
    if (q && !simples(l.name).includes(q)) return false;
    if (f.origem && l.channel !== f.origem) return false;
    if (f.temperatura && l.temperature !== f.temperatura) return false;
    if (f.situacao && situacaoDe(l) !== f.situacao) return false;
    return true;
  });
}

/**
 * A ordem da lista: quem pede atenção primeiro.
 *
 * Em negociação na frente — é o que ainda dá para mudar hoje. Depois
 * cliente, ex-cliente e quem não fechou, que são consulta. Dentro de
 * cada grupo, o maior valor em cima.
 */
const PESO: Record<Situacao, number> = {
  "Em negociação": 0,
  "Cliente ativo": 1,
  "Ex-cliente": 2,
  "Não fechou": 3,
};

export function ordenar<T extends DaBase>(base: T[]): T[] {
  return [...base].sort((a, b) => {
    const d = PESO[situacaoDe(a)] - PESO[situacaoDe(b)];
    if (d !== 0) return d;
    return b.estimated_monthly - a.estimated_monthly;
  });
}

/** Quantos em cada situação, para os números do topo. */
export function contar(base: DaBase[]): Record<Situacao, number> {
  const c: Record<Situacao, number> = {
    "Em negociação": 0,
    "Cliente ativo": 0,
    "Ex-cliente": 0,
    "Não fechou": 0,
  };
  for (const l of base) c[situacaoDe(l)] += 1;
  return c;
}
