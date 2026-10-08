import { COL_DELIM } from "@/lib/import/planning-parser";

/**
 * Parser do MODELO DE ROTEIRO (documento da Vitória): uma tabela de 2 colunas
 *   FALA / LETTERING | CENAS
 * precedida por um cabeçalho (####, "CONTEÚDO N:", "DATA DA POSTAGEM:",
 * "LOCAL:", "VESTIMENTA:"…).
 *
 * Ao extrair o texto do PDF/doc, as colunas vêm "achatadas": primeiro TODO o
 * texto da célula FALA da linha, depois TODO o texto da célula CENAS, e assim
 * por diante. Aqui a gente:
 *  1. joga fora o cabeçalho (tudo antes da linha "FALA ... CENAS");
 *  2. reconstrói as linhas da tabela: acumula FALA/LETTERING de um lado e a
 *     descrição de cena (CENAS) do outro, trocando de lado quando reconhece
 *     o começo de uma cena, e começando uma linha nova quando um "FALA:"
 *     aparece depois de já ter cena.
 * Devolve o roteiro no formato de 2 colunas (separadas por COL_DELIM), que a
 * tabela fiel do conteúdo já sabe renderizar. Null se não for esse modelo.
 */

export interface LinhaRoteiroDoc {
  fala: string;
  cena: string;
}

const FALA_RE = /^FALA\s*[:：]/i;
const LETT_RE = /^LETTERING\s*[:：]/i;
// Começo de uma descrição de CENA (coluna direita).
const CENA_RE =
  /^(fisio|exerc[ií]cio|close|cena|plano|imagem|tela|corte|b-?roll|take|anima[çc][aã]o|v[ií]deo|grava[çc][aã]o|legenda da cena|detalhe|insert|transi[çc][aã]o)\b/i;
// Cabeçalho da tabela: "FALA / LETTERING    CENAS".
const HEADER_RE = /\bfala\b.*\blettering\b.*\bcenas\b|\bfala\b.*\bcenas\b/i;

/** Normaliza uma string pra teste sem acento e minúscula. */
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function parseRoteiroDoc(
  texto: string,
): { linhas: LinhaRoteiroDoc[] } | null {
  const todas = texto
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0);

  // Acha o cabeçalho da tabela (primeira linha "FALA ... CENAS" curta).
  const idxHeader = todas.findIndex(
    (l) => HEADER_RE.test(norm(l)) && !FALA_RE.test(l) && l.length <= 60,
  );
  if (idxHeader < 0) return null;

  const corpo = todas.slice(idxHeader + 1).filter((l) => {
    // Pula cabeçalhos repetidos (tabela continua na página seguinte) e os "####".
    if (HEADER_RE.test(norm(l)) && !FALA_RE.test(l) && l.length <= 60) return false;
    if (/^#{3,}$/.test(l)) return false;
    return true;
  });

  const linhas: LinhaRoteiroDoc[] = [];
  let fala: string[] = [];
  let cena: string[] = [];
  let modo: "fala" | "cena" = "fala";

  const fechar = () => {
    const f = fala.join(" ").replace(/\s+/g, " ").trim();
    const c = cena.join(" ").replace(/\s+/g, " ").trim();
    if (f || c) linhas.push({ fala: f, cena: c });
    fala = [];
    cena = [];
  };

  for (const l of corpo) {
    if (FALA_RE.test(l)) {
      // Novo "FALA:" depois de já ter cena = começa uma linha nova da tabela.
      if (modo === "cena" && (fala.length || cena.length)) fechar();
      modo = "fala";
      fala.push(l);
    } else if (LETT_RE.test(l)) {
      modo = "fala";
      fala.push(l);
    } else if (CENA_RE.test(l)) {
      modo = "cena";
      cena.push(l);
    } else {
      // Continuação (quebra de linha da mesma célula).
      if (modo === "fala") fala.push(l);
      else cena.push(l);
    }
  }
  fechar();

  // Só vale se reconstruiu linhas com alguma fala (senão não era esse modelo).
  const temFala = linhas.some((r) => FALA_RE.test(r.fala));
  if (linhas.length === 0 || !temFala) return null;
  return { linhas };
}

/** Converte o resultado no texto de roteiro (2 colunas, separadas por COL_DELIM). */
export function roteiroDocParaScript(r: { linhas: LinhaRoteiroDoc[] }): string {
  const header = `FALA / LETTERING${COL_DELIM}CENAS`;
  const corpo = r.linhas.map(
    (l) => `${l.fala}${COL_DELIM}${l.cena}`,
  );
  return [header, ...corpo].join("\n");
}
