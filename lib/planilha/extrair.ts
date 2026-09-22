/**
 * Extrai o conteúdo de uma planilha (Excel .xlsx/.xls ou .csv) para uma grade
 * de texto (linhas x colunas), pronta para mostrar como tabela. Roda no
 * navegador. O Excel é lido sob demanda (import dinâmico) para não pesar.
 * Também extrai os KPIs principais (dashboard) a partir da grade.
 */

import type { MetricaTrafego } from "@/types";

const MAX_LINHAS = 60;
const MAX_COLUNAS = 20;
const MAX_CELULA = 120;

/** Parser de CSV simples (aspas, "" literal, quebras de linha no campo). */
function parseCSV(texto: string): string[][] {
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let aspas = false;
  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i];
    if (aspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i += 1;
        } else aspas = false;
      } else campo += c;
      continue;
    }
    if (c === '"') aspas = true;
    else if (c === ",") {
      linha.push(campo);
      campo = "";
    } else if (c === "\n") {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else if (c !== "\r") campo += c;
  }
  linha.push(campo);
  linhas.push(linha);
  return linhas;
}

/** Limpa a grade: apara célula, remove linhas/colunas vazias e limita tamanho. */
function normalizar(grade: unknown[][]): string[][] {
  let linhas = grade.map((l) =>
    (l ?? []).map((c) => String(c ?? "").trim().slice(0, MAX_CELULA)),
  );
  // remove linhas totalmente vazias
  linhas = linhas.filter((l) => l.some((c) => c !== ""));
  if (linhas.length === 0) return [];
  // largura = maior linha, limitada
  const largura = Math.min(
    Math.max(...linhas.map((l) => l.length)),
    MAX_COLUNAS,
  );
  linhas = linhas.slice(0, MAX_LINHAS).map((l) => {
    const cortada = l.slice(0, largura);
    while (cortada.length < largura) cortada.push("");
    return cortada;
  });
  // remove colunas totalmente vazias (da direita para a esquerda)
  for (let col = largura - 1; col >= 0; col -= 1) {
    if (linhas.every((l) => l[col] === "")) {
      linhas.forEach((l) => l.splice(col, 1));
    }
  }
  return linhas.filter((l) => l.some((c) => c !== ""));
}

/* ------------------------------------------------------------------ */
/* KPIs (dashboard) a partir da grade                                 */
/* ------------------------------------------------------------------ */

function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Lê um número em pt-BR ("R$ 1.234,56", "12.000", "3,5%"). */
function parseNum(s: string): number | null {
  if (!s) return null;
  let t = s.replace(/\s/g, "").replace(/[^0-9.,-]/g, "");
  if (!t || t === "-") return null;
  if (t.includes(",") && t.includes(".")) t = t.replace(/\./g, "").replace(",", ".");
  else if (t.includes(",")) t = t.replace(",", ".");
  else if (t.includes(".")) {
    const partes = t.split(".");
    const ultimo = partes[partes.length - 1];
    if (partes.length > 2 || ultimo.length === 3) t = t.replace(/\./g, "");
  }
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

const CANON: { label: string; aliases: string[]; dinheiro?: boolean }[] = [
  { label: "Investimento", aliases: ["valor gasto", "valor usado", "investimento", "amount spent", "gasto"], dinheiro: true },
  { label: "Pessoas alcançadas", aliases: ["alcance", "pessoas alcancadas", "reach"] },
  { label: "Impressões", aliases: ["impressoes", "impressions"] },
  { label: "Visitas à página", aliases: ["visitas a pagina", "landing page views", "visualizacoes da pagina", "visitas ao perfil", "visitas"] },
  { label: "Cliques no link", aliases: ["cliques no link", "link clicks", "cliques (todos)", "cliques"] },
  { label: "Conversas iniciadas", aliases: ["conversas iniciadas", "conversas por mensagem iniciadas", "mensagens iniciadas", "conversations started", "conversas"] },
  { label: "Resultados", aliases: ["resultados", "results"] },
  { label: "Custo por resultado", aliases: ["custo por resultado", "cost per result", "custo por conversa"], dinheiro: true },
];

function achaLabel(txt: string): string | null {
  const t = semAcento(txt);
  if (!t) return null;
  let best: { label: string; len: number } | null = null;
  for (const c of CANON)
    for (const a of c.aliases)
      if (t.includes(a) && (!best || a.length > best.len))
        best = { label: c.label, len: a.length };
  return best?.label ?? null;
}

function formatar(label: string, n: number): string {
  const c = CANON.find((x) => x.label === label);
  if (c?.dinheiro)
    return n.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 2,
    });
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

/**
 * Extrai os KPIs principais da grade (para o dashboard). Entende dois formatos:
 *  - tabela (cabeçalho com colunas de métrica + linhas): soma cada coluna;
 *  - chave/valor (métrica numa coluna, número na outra): pega o valor.
 * Devolve rótulo->valor na ordem canônica.
 */
export function extrairKPIs(grid: string[][]): MetricaTrafego[] {
  if (grid.length === 0) return [];
  const out = new Map<string, string>();

  // Procura um cabeçalho de tabela (>=2 colunas reconhecidas) nas 1as linhas.
  let headerIdx = -1;
  let cols: { col: number; label: string }[] = [];
  for (let i = 0; i < Math.min(grid.length, 6); i += 1) {
    const map = new Map<string, number>();
    grid[i].forEach((cell, col) => {
      const l = achaLabel(cell);
      if (l && !map.has(l)) map.set(l, col);
    });
    if (map.size >= 2) {
      headerIdx = i;
      cols = [...map.entries()].map(([label, col]) => ({ col, label }));
      break;
    }
  }

  if (headerIdx >= 0) {
    for (const { col, label } of cols) {
      let soma = 0;
      let achou = false;
      for (let r = headerIdx + 1; r < grid.length; r += 1) {
        const n = parseNum(grid[r]?.[col] ?? "");
        if (n != null) {
          soma += n;
          achou = true;
        }
      }
      if (achou) out.set(label, formatar(label, soma));
    }
  } else {
    // chave/valor: cada linha com uma métrica reconhecida + 1º número da linha.
    for (const row of grid) {
      let label: string | null = null;
      for (const cell of row) {
        const l = achaLabel(cell);
        if (l) {
          label = l;
          break;
        }
      }
      if (!label || out.has(label)) continue;
      for (const cell of row) {
        if (parseNum(cell) != null) {
          out.set(label, cell.trim());
          break;
        }
      }
    }
  }

  return CANON.filter((c) => out.has(c.label)).map((c) => ({
    label: c.label,
    value: out.get(c.label)!,
  }));
}

export async function extrairPlanilha(file: File): Promise<string[][]> {
  const ehCSV =
    /\.csv$/i.test(file.name) || file.type === "text/csv";
  if (ehCSV) {
    return normalizar(parseCSV(await file.text()));
  }
  // Excel: lê a primeira aba como grade.
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const primeira = wb.SheetNames[0];
  if (!primeira) return [];
  const grade = XLSX.utils.sheet_to_json(wb.Sheets[primeira], {
    header: 1,
    blankrows: false,
    defval: "",
  }) as unknown[][];
  return normalizar(grade);
}
