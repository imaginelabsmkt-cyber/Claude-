/**
 * Leitura de texto de um PDF NO NAVEGADOR (sem mandar o arquivo pro servidor).
 * Usa o pdf.js (carregado sob demanda). O worker vem do CDN, casando a versão
 * da lib, então roda na máquina de quem está usando o sistema.
 *
 * É "melhor esforço": PDFs muito floreados (feitos no Canva/slides) podem sair
 * com o texto um pouco embaralhado — por isso sempre mostramos uma prévia pra
 * pessoa revisar antes de criar qualquer coisa.
 */

interface ItemTexto {
  str?: string;
  hasEOL?: boolean;
}

/** Extrai o texto de um arquivo PDF, preservando as quebras de linha. */
export async function lerTextoPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

  const dados = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: dados }).promise;

  const linhas: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const conteudo = await page.getTextContent();
    let atual = "";
    for (const item of conteudo.items as ItemTexto[]) {
      if (typeof item.str !== "string") continue;
      atual += item.str;
      if (item.hasEOL) {
        linhas.push(atual.trim());
        atual = "";
      } else {
        atual += " ";
      }
    }
    if (atual.trim()) linhas.push(atual.trim());
  }

  return linhas.filter((l) => l.length > 0).join("\n");
}
