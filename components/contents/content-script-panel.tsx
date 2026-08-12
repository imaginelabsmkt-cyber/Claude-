"use client";

import { useMemo, useState } from "react";

interface ContentScriptPanelProps {
  script: string | null;
  caption: string | null;
}

type Bloco =
  | { tipo: "titulo"; texto: string }
  | { tipo: "fala"; quem: string; texto: string }
  | { tipo: "cena"; texto: string };

/** Cabeçalho em maiúsculas (ex.: "OFF / LETTERING", "CENAS"). */
function ehTitulo(linha: string): boolean {
  const letras = linha.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letras.length < 2 || linha.length > 48) return false;
  const semAcento = letras.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return semAcento === semAcento.toUpperCase();
}

/** Separa o corpo em: roteiro, legenda e direcionamento de stories. */
function separarSecoes(script: string): {
  roteiro: string[];
  legenda: string[];
  stories: string[];
} {
  const roteiro: string[] = [];
  const legenda: string[] = [];
  const stories: string[] = [];
  let modo: "roteiro" | "legenda" | "stories" = "roteiro";

  for (const bruta of script.split(/\r?\n/)) {
    const l = bruta.trim();
    if (!l) continue;
    if (/^LEGENDA\s*[:\-–]?/i.test(l)) {
      modo = "legenda";
      const v = l.replace(/^LEGENDA\s*[:\-–]?\s*/i, "");
      if (v) legenda.push(v);
      continue;
    }
    if (/DIRECIONAMENTO\s+DE\s+STORIES/i.test(l)) {
      modo = "stories";
      continue;
    }
    if (modo === "roteiro") roteiro.push(l);
    else if (modo === "legenda") legenda.push(l);
    else stories.push(l);
  }
  return { roteiro, legenda, stories };
}

/** Interpreta as linhas do roteiro em blocos (título / fala / cena). */
function interpretar(linhas: string[]): Bloco[] {
  const blocos: Bloco[] = [];
  for (const linha of linhas) {
    const mFala = linha.match(/^FALA\s+(.+?)\s*:\s*(.*)$/i);
    if (mFala) {
      blocos.push({ tipo: "fala", quem: mFala[1].trim(), texto: mFala[2].trim() });
      continue;
    }
    if (ehTitulo(linha.replace(/:$/, ""))) {
      blocos.push({ tipo: "titulo", texto: linha.replace(/:$/, "") });
      continue;
    }
    blocos.push({ tipo: "cena", texto: linha });
  }
  return blocos;
}

/** Cabeçalho de documento que às vezes vaza para a legenda (ex.: "PLANEJAMENTO OSTEO&FIT JULHO"). */
function ehLixoDeDocumento(linha: string): boolean {
  const semAcento = linha.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const soMaiusculas =
    /[A-Z]/.test(semAcento) && semAcento === semAcento.toUpperCase();
  if (
    soMaiusculas &&
    /^(PLANEJAMENTO|SEMANA|CONTE[UÚ]DO|DIRECIONAMENTO)\b/i.test(linha)
  ) {
    return true;
  }
  return /^LEGENDA\s*[:\-–]?\s*$/i.test(linha);
}

/**
 * Deixa a legenda pronta para copiar e colar na postagem: remove cabeçalhos
 * do documento que vazaram e separa os parágrafos com uma linha em branco
 * (fica mais legível e "arejada" no Instagram).
 */
function formatarLegenda(texto: string): string {
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !ehLixoDeDocumento(l));
  return linhas.join("\n\n");
}

/** Botão de copiar com feedback. */
function BotaoCopiar({ texto, rotulo }: { texto: string; rotulo: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1800);
        } catch {
          setCopiado(false);
        }
      }}
      className="inline-flex items-center gap-1 rounded-md border border-brand-300 bg-white px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
    >
      {copiado ? "✓ Copiado!" : `📋 ${rotulo}`}
    </button>
  );
}

const LIMITE_PREVIA = 4;

/** Linha da tabela de roteiro: par OFF/LETTERING (fala) + CENAS (cena). */
type LinhaRoteiro =
  | { divisor: string }
  | { quem: string | null; off: string; cena: string };

/**
 * Monta a tabela de 2 colunas (OFF / LETTERING | CENAS), igual ao
 * planejamento: cada fala pareada com a cena que a acompanha.
 */
function montarLinhas(blocos: Bloco[]): LinhaRoteiro[] {
  const linhas: LinhaRoteiro[] = [];
  let atual: { quem: string | null; off: string; cena: string } | null = null;
  const flush = () => {
    if (atual && (atual.off || atual.cena)) linhas.push(atual);
    atual = null;
  };
  for (const b of blocos) {
    if (b.tipo === "titulo") {
      // "OFF / LETTERING" e "CENAS" são os cabeçalhos das colunas — ignora.
      if (/OFF|LETTERING|CENA/i.test(b.texto)) continue;
      flush();
      linhas.push({ divisor: b.texto });
      continue;
    }
    if (b.tipo === "fala") {
      if (atual && atual.off) flush();
      atual = atual ?? { quem: null, off: "", cena: "" };
      atual.quem = b.quem;
      atual.off = b.texto;
    } else {
      atual = atual ?? { quem: null, off: "", cena: "" };
      atual.cena = b.texto;
      flush(); // fala + cena completam uma linha
    }
  }
  flush();
  return linhas;
}

/** Tabela do roteiro em 2 colunas, com versão curta que expande. */
function TabelaRoteiro({ blocos }: { blocos: Bloco[] }) {
  const [aberto, setAberto] = useState(false);
  const linhas = montarLinhas(blocos);
  const visiveis = aberto ? linhas : linhas.slice(0, LIMITE_PREVIA);
  const restantes = linhas.length - LIMITE_PREVIA;

  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead>
            <tr className="bg-brand-50 text-[11px] font-bold uppercase tracking-wider text-brand-700">
              <th className="w-1/2 border-r border-brand-100 px-3 py-2">
                OFF / Lettering
              </th>
              <th className="w-1/2 px-3 py-2">Cenas</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((l, i) =>
              "divisor" in l ? (
                <tr key={i} className="bg-gray-50">
                  <td
                    colSpan={2}
                    className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500"
                  >
                    {l.divisor}
                  </td>
                </tr>
              ) : (
                <tr key={i} className="border-t border-gray-100 align-top">
                  <td className="break-words border-r border-gray-100 px-3 py-2 leading-relaxed text-gray-900">
                    {l.quem ? (
                      <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-brand-600">
                        {l.quem}
                      </span>
                    ) : null}
                    {l.off || "—"}
                  </td>
                  <td className="break-words px-3 py-2 italic leading-relaxed text-gray-500">
                    {l.cena || "—"}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
      {restantes > 0 ? (
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="mt-2 text-xs font-semibold text-brand-700 hover:underline"
        >
          {aberto ? "Recolher roteiro ▲" : `Ver roteiro completo (+${restantes}) ▼`}
        </button>
      ) : null}
    </div>
  );
}

/** Tabela dos stories (direcionamento). */
function TabelaStories({ linhas }: { linhas: string[] }) {
  let n = 0;
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="w-full border-collapse text-left text-sm">
        <tbody>
          {linhas.map((l, i) => {
            const cabecalho = ehTitulo(l.replace(/:$/, ""));
            if (cabecalho) {
              return (
                <tr key={i} className="bg-purple-50">
                  <td
                    colSpan={2}
                    className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-purple-700"
                  >
                    {l.replace(/:$/, "")}
                  </td>
                </tr>
              );
            }
            n += 1;
            return (
              <tr key={i} className="border-t border-gray-100 align-top">
                <td className="w-16 whitespace-nowrap px-3 py-2 text-[11px] font-bold uppercase text-purple-600">
                  {n}
                </td>
                <td className="px-3 py-2 leading-relaxed text-gray-800">{l}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Painel de roteiro + legenda + stories de um conteúdo.
 * - Legenda sempre visível e pronta para copiar.
 * - Roteiro em tabela, com versão curta que expande para leitura completa.
 * - Direcionamento de stories separado em tabela própria.
 */
export function ContentScriptPanel({ script, caption }: ContentScriptPanelProps) {
  const secoes = useMemo(
    () => (script ? separarSecoes(script) : { roteiro: [], legenda: [], stories: [] }),
    [script],
  );
  const blocos = useMemo(() => interpretar(secoes.roteiro), [secoes.roteiro]);

  const legendaTexto = formatarLegenda(
    (caption && caption.trim()) || secoes.legenda.join("\n").trim(),
  );

  const temAlgo =
    blocos.length > 0 || legendaTexto.length > 0 || secoes.stories.length > 0;
  if (!temAlgo) return null;

  return (
    <div className="mt-6 space-y-6">
      {/* Legenda — sempre visível, pronta para copiar */}
      {legendaTexto ? (
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-900">Legenda</h2>
            <BotaoCopiar texto={legendaTexto} rotulo="Copiar legenda" />
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
              {legendaTexto}
            </p>
          </div>
        </div>
      ) : null}

      {/* Roteiro — tabela, curto e expansível */}
      {blocos.length > 0 ? (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-900">Roteiro</h2>
          <TabelaRoteiro blocos={blocos} />
        </div>
      ) : null}

      {/* Stories — direcionamento separado */}
      {secoes.stories.length > 0 ? (
        <div>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <span aria-hidden="true">⚡</span> Direcionamento de stories
          </h2>
          <TabelaStories linhas={secoes.stories} />
        </div>
      ) : null}
    </div>
  );
}
