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
 * Extrai o texto de um arquivo .docx (que é um zip com word/document.xml).
 * Cada parágrafo vira uma linha. Sem dependências pesadas (usa fflate).
 */
export function extrairTextoDocx(bytes: Uint8Array): string {
  const arquivos = unzipSync(bytes);
  const doc = arquivos["word/document.xml"];
  if (!doc) {
    throw new Error("Arquivo .docx inválido (word/document.xml não encontrado).");
  }
  let xml = strFromU8(doc);
  // fim de parágrafo -> quebra de linha; tabs
  xml = xml.replace(/<\/w:p>/g, "\n").replace(/<w:tab[^>]*\/>/g, "\t");
  // remove todas as tags restantes
  const texto = xml.replace(/<[^>]+>/g, "");
  return decodificar(texto);
}
