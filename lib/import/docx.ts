import { unzipSync, strFromU8 } from "fflate";
import { COL_DELIM } from "@/lib/import/planning-parser";

/** Decodifica as entidades XML mais comuns. */
function decodificar(texto: string): string {
  return texto
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

/**
 * Mapa de hyperlinks (r:id -> URL) a partir de word/_rels/document.xml.rels.
 * É onde o Word guarda o destino real dos links clicáveis (o texto do
 * documento mostra só a palavra, não a URL).
 */
function mapaHyperlinks(
  arquivos: Record<string, Uint8Array>,
): Map<string, string> {
  const rels = new Map<string, string>();
  const raw = arquivos["word/_rels/document.xml.rels"];
  if (!raw) return rels;
  const xml = strFromU8(raw);
  for (const m of xml.matchAll(/<Relationship\b[^>]*>/g)) {
    const tag = m[0];
    const id = tag.match(/Id="([^"]+)"/)?.[1];
    const target = tag.match(/Target="([^"]+)"/)?.[1];
    if (id && target && /^https?:\/\//i.test(target)) {
      rels.set(id, decodificar(target));
    }
  }
  return rels;
}

/** Texto de UMA célula (junta os parágrafos da célula num espaço só). */
function textoDaCelula(tcXml: string): string {
  const partes: string[] = [];
  for (const p of tcXml.split(/<\/w:p>/)) {
    const runs = p.match(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g) ?? [];
    const txt = runs
      .map((r) => r.replace(/<[^>]+>/g, ""))
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    if (txt) partes.push(txt);
  }
  return partes.join(" ");
}

/**
 * Converte uma TABELA do Word em texto preservando a estrutura: cada linha da
 * tabela vira uma linha; as colunas ficam separadas por COL_DELIM. É assim que
 * o roteiro (ex.: FALA | CENAS) mantém as colunas do documento da Vitória.
 */
function tabelaParaTexto(tblXml: string): string {
  const linhas: string[] = [];
  for (const tr of tblXml.match(/<w:tr\b[\s\S]*?<\/w:tr>/g) ?? []) {
    const celulas = (tr.match(/<w:tc\b[\s\S]*?<\/w:tc>/g) ?? []).map(textoDaCelula);
    // Linha totalmente vazia não entra.
    if (celulas.some((c) => c.length > 0)) linhas.push(celulas.join(COL_DELIM));
  }
  return linhas.join("\n");
}

/**
 * Extrai o texto de um arquivo .docx (que é um zip com word/document.xml).
 * Cada parágrafo vira uma linha. Links clicáveis têm a URL real reinjetada
 * no texto. TABELAS (roteiro) são preservadas: cada linha da tabela vira uma
 * linha com as colunas separadas por COL_DELIM.
 */
export function extrairTextoDocx(bytes: Uint8Array): string {
  const arquivos = unzipSync(bytes);
  const doc = arquivos["word/document.xml"];
  if (!doc) {
    throw new Error("Arquivo .docx inválido (word/document.xml não encontrado).");
  }
  const links = mapaHyperlinks(arquivos);
  let xml = strFromU8(doc);
  // Reinjeta a URL de cada link clicável como texto, junto ao texto visível.
  xml = xml.replace(/<w:hyperlink\b[^>]*r:id="([^"]+)"[^>]*>/g, (tag, id) => {
    const url = links.get(id);
    return url ? `${tag} ${url} ` : tag;
  });
  // Substitui cada TABELA pelo seu texto estruturado (linhas + COL_DELIM).
  xml = xml.replace(
    /<w:tbl>[\s\S]*?<\/w:tbl>/g,
    (tbl) => `\n${tabelaParaTexto(tbl)}\n`,
  );
  // fim de parágrafo -> quebra de linha; tabs
  xml = xml.replace(/<\/w:p>/g, "\n").replace(/<w:tab[^>]*\/>/g, "\t");
  // remove todas as tags restantes
  const texto = xml.replace(/<[^>]+>/g, "");
  return decodificar(texto);
}
