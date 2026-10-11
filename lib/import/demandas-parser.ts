/**
 * Parser de uma LISTA DE DEMANDAS vinda de planilha (Excel/CSV) ou texto colado.
 * Formato esperado (uma linha de cabeçalho + linhas):
 *   Nº | Demanda | Responsável | Prazo | Mês | Área | Pronto quando | Status
 * Só "Demanda" é obrigatória; o resto é opcional. O Prazo pode vir como número
 * de série do Excel (ex.: 46307) ou como data (dd/mm, dd/mm/aaaa, aaaa-mm-dd).
 */

export type StatusDemandaImport = "A fazer" | "Fazendo" | "Feita";

export interface ItemDemandaImport {
  title: string;
  responsavel: string | null; // "Vitória" | "Fran" | "As duas" | texto
  dueDate: string | null; // ISO
  mes: string | null;
  area: string | null;
  prontoQuando: string | null;
  status: StatusDemandaImport;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function norm(s: string): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Número de série do Excel (base 1899-12-30) -> ISO. */
function serialParaISO(n: number): string | null {
  if (!Number.isFinite(n) || n < 20000 || n > 90000) return null;
  const base = Date.UTC(1899, 11, 30);
  const d = new Date(base + n * 86400000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate(),
  )}`;
}

/** Converte o valor da coluna Prazo em ISO (ou null). */
export function parsePrazo(valor: string): string | null {
  const s = (valor ?? "").trim();
  if (!s) return null;
  if (/^\d+(\.0+)?$/.test(s)) return serialParaISO(Math.round(Number(s)));
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    let y = m[3] ? Number(m[3]) : new Date().getFullYear();
    if (y < 100) y += 2000;
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) {
      return `${y}-${pad(mo)}-${pad(d)}`;
    }
  }
  return null;
}

function normalizarStatus(valor: string): StatusDemandaImport {
  const s = norm(valor);
  if (s.startsWith("feit") || s === "ok" || s === "pronto" || s === "concluid")
    return "Feita";
  if (s.startsWith("fazend") || s.includes("andamento")) return "Fazendo";
  return "A fazer";
}

/** Índice da coluna cujo cabeçalho casa com um dos aliases. */
function acharCol(cabecalho: string[], aliases: string[]): number {
  return cabecalho.findIndex((c) => {
    const n = norm(c);
    return aliases.some((a) => n === a || n.includes(a));
  });
}

/**
 * Lê a grade (linhas x colunas) e devolve as demandas. Acha a linha de
 * cabeçalho por conter "demanda"; ignora título e instruções antes dela.
 */
export function parseDemandasGrade(grade: string[][]): ItemDemandaImport[] {
  const linhas = grade.map((r) => r.map((c) => (c ?? "").toString()));
  const idxHeader = linhas.findIndex(
    (r) => r.some((c) => norm(c) === "demanda") && r.length >= 2,
  );
  if (idxHeader < 0) return [];

  const cab = linhas[idxHeader];
  const col = {
    title: acharCol(cab, ["demanda", "tarefa", "titulo"]),
    resp: acharCol(cab, ["responsavel", "resp", "quem"]),
    prazo: acharCol(cab, ["prazo", "data", "entrega"]),
    mes: acharCol(cab, ["mes"]),
    area: acharCol(cab, ["area", "categoria", "tipo"]),
    pronto: acharCol(cab, ["pronto quando", "pronto", "criterio", "entregavel"]),
    status: acharCol(cab, ["status", "situacao"]),
  };
  if (col.title < 0) return [];

  const itens: ItemDemandaImport[] = [];
  for (const linha of linhas.slice(idxHeader + 1)) {
    const title = (linha[col.title] ?? "").trim();
    if (!title || norm(title) === "demanda") continue;
    const resp = col.resp >= 0 ? (linha[col.resp] ?? "").trim() : "";
    const area = col.area >= 0 ? (linha[col.area] ?? "").trim() : "";
    const pronto = col.pronto >= 0 ? (linha[col.pronto] ?? "").trim() : "";
    const mes = col.mes >= 0 ? (linha[col.mes] ?? "").trim() : "";
    const prazo = col.prazo >= 0 ? parsePrazo(linha[col.prazo] ?? "") : null;
    const status =
      col.status >= 0 ? normalizarStatus(linha[col.status] ?? "") : "A fazer";
    itens.push({
      title: title.slice(0, 300),
      responsavel: resp || null,
      dueDate: prazo,
      mes: mes || null,
      area: area || null,
      prontoQuando: pronto || null,
      status,
    });
  }
  return itens;
}

/** Converte texto colado (TAB ou | ou CSV simples) numa grade. */
export function textoParaGrade(texto: string): string[][] {
  return texto
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => {
      if (l.includes("\t")) return l.split("\t");
      if (l.includes("|")) return l.split("|").map((c) => c.trim());
      return [l];
    });
}
