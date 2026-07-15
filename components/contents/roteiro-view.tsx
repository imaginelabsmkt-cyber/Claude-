import { Fragment } from "react";

interface RoteiroViewProps {
  texto: string;
}

type Bloco =
  | { tipo: "titulo"; texto: string }
  | { tipo: "fala"; quem: string; texto: string }
  | { tipo: "cena"; texto: string };

/** Verdadeiro se a linha é um cabeçalho (só maiúsculas), ex.: "OFF / LETTERING". */
function ehTitulo(linha: string): boolean {
  const letras = linha.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letras.length < 2 || linha.length > 48) return false;
  const semAcento = letras.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return semAcento === semAcento.toUpperCase();
}

/** Quebra o roteiro cru em blocos estruturados (título / fala / cena). */
function interpretar(texto: string): Bloco[] {
  const linhas = texto.split(/\r?\n/).map((l) => l.trim());
  const blocos: Bloco[] = [];
  for (const linha of linhas) {
    if (!linha) continue;
    const mFala = linha.match(/^FALA\s+(.+?)\s*:\s*(.*)$/i);
    if (mFala) {
      blocos.push({
        tipo: "fala",
        quem: mFala[1].trim(),
        texto: mFala[2].trim(),
      });
      continue;
    }
    // Rótulos genéricos "ALGO:" curtos e em maiúsculas também viram título.
    if (ehTitulo(linha.replace(/:$/, ""))) {
      blocos.push({ tipo: "titulo", texto: linha.replace(/:$/, "") });
      continue;
    }
    blocos.push({ tipo: "cena", texto: linha });
  }
  return blocos;
}

/**
 * Exibe o roteiro de forma legível, no estilo de um roteiro de gravação:
 * - Títulos de seção (OFF / LETTERING, CENAS...) como divisórias.
 * - Falas com o nome de quem fala em destaque.
 * - Cenas / direções em itálico, como marcações de gravação.
 */
export function RoteiroView({ texto }: RoteiroViewProps) {
  const blocos = interpretar(texto);
  if (blocos.length === 0) {
    return (
      <p className="whitespace-pre-wrap text-sm text-gray-700">{texto}</p>
    );
  }
  return (
    <div className="space-y-2.5">
      {blocos.map((b, i) => (
        <Fragment key={i}>
          {b.tipo === "titulo" ? (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700">
                {b.texto}
              </span>
              <span className="h-px flex-1 bg-gray-200" />
            </div>
          ) : b.tipo === "fala" ? (
            <div className="rounded-lg bg-brand-50/70 px-3 py-2">
              <span className="mb-0.5 block text-[11px] font-bold uppercase tracking-wide text-brand-700">
                🎙️ {b.quem}
              </span>
              <p className="text-[15px] leading-relaxed text-gray-900">
                {b.texto || "—"}
              </p>
            </div>
          ) : (
            <p className="flex gap-2 border-l-2 border-gray-200 pl-3 text-sm italic leading-relaxed text-gray-500">
              <span aria-hidden="true" className="not-italic">
                🎬
              </span>
              <span>{b.texto}</span>
            </p>
          )}
        </Fragment>
      ))}
    </div>
  );
}
