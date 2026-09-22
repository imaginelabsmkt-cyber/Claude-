/**
 * Extrai o conteúdo de uma planilha (Excel .xlsx/.xls ou .csv) para uma grade
 * de texto (linhas x colunas), pronta para mostrar como tabela. Roda no
 * navegador. O Excel é lido sob demanda (import dinâmico) para não pesar.
 */

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
