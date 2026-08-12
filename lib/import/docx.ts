import { unzipSync, strFromU8 } from "fflate";

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

/**
 * Extrai o texto de um arquivo .docx (que é um zip com word/document.xml).
 * Cada parágrafo vira uma linha. Links clicáveis têm a URL real reinjetada
 * no texto (senão o destino do link se perderia). Sem dependências pesadas.
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
  // fim de parágrafo -> quebra de linha; tabs
  xml = xml.replace(/<\/w:p>/g, "\n").replace(/<w:tab[^>]*\/>/g, "\t");
  // remove todas as tags restantes
  const texto = xml.replace(/<[^>]+>/g, "");
  return decodificar(texto);
}
