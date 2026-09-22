import { COL_DELIM } from "@/lib/import/planning-parser";
import type { RoteiroOrganizado } from "@/lib/portal/tipos";

/**
 * Organiza o roteiro da Vitória para o cliente ver de forma limpa. O documento
 * dela vem em 2 colunas (FALA | CENAS/DIREÇÃO) separadas por um caractere
 * interno (COL_DELIM). Aqui a gente:
 *  - pega só a parte do roteiro (antes de LEGENDA / DIRECIONAMENTO DE STORIES);
 *  - separa cada linha em "fala" (o que é dito) e "direção" (o que aparece);
 *  - tira o prefixo "FALA:" e o cabeçalho da tabela, que não interessam;
 *  - se não for tabela, devolve o texto em parágrafos.
 * Devolve null quando não há roteiro aproveitável.
 */
export function organizarRoteiro(script: string | null): RoteiroOrganizado | null {
  if (!script?.trim()) return null;

  // Fica só com a seção de roteiro (para antes da legenda / stories).
  const linhas: string[] = [];
  for (const bruta of script.split(/\r?\n/)) {
    const l = bruta.trim();
    if (!l) continue;
    if (/^LEGENDA\s*[:\-–]?/i.test(l)) break;
    if (/DIRECIONAMENTO\s+DE\s+STORIES/i.test(l)) break;
    linhas.push(l);
  }
  if (linhas.length === 0) return null;

  const semFala = (t: string) => t.replace(/^FALA\s*[^:]*:\s*/i, "").trim();

  // Formato tabela (2 colunas separadas por COL_DELIM).
  const tabela = linhas.filter((l) => l.includes(COL_DELIM));
  if (tabela.length > 0) {
    const rows = tabela.map((l) => l.split(COL_DELIM).map((c) => c.trim()));
    // 1ª linha é cabeçalho se as duas colunas forem curtas (ex.: "FALA"/"CENAS").
    const primeira = rows[0];
    const ehCabecalho =
      primeira.length >= 2 && primeira.every((c) => c.length <= 40);
    const corpo = ehCabecalho ? rows.slice(1) : rows;
    const roteiroLinhas = corpo
      .map((r) => ({ fala: semFala(r[0] ?? ""), direcao: (r[1] ?? "").trim() }))
      .filter((r) => r.fala || r.direcao);
    if (roteiroLinhas.length === 0) return null;
    return { linhas: roteiroLinhas, paragrafos: [] };
  }

  // Texto corrido: limpa resíduos do separador e o prefixo "FALA:".
  const paragrafos = linhas
    .map((l) => semFala(l.split(COL_DELIM).join(" ").trim()))
    .filter(Boolean);
  if (paragrafos.length === 0) return null;
  return { linhas: [], paragrafos };
}
