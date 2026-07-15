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

/** Tabela do roteiro (cenas/falas), com versão curta que expande. */
function TabelaRoteiro({ blocos }: { blocos: Bloco[] }) {
  const [aberto, setAberto] = useState(false);
  const visiveis = aberto ? blocos : blocos.slice(0, LIMITE_PREVIA);
  const restantes = blocos.length - LIMITE_PREVIA;

  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full border-collapse text-left text-sm">
          <tbody>
            {visiveis.map((b, i) =>
              b.tipo === "titulo" ? (
                <tr key={i} className="bg-brand-50/60">
                  <td
                    colSpan={2}
                    className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-700"
                  >
                    {b.texto}
                  </td>
                </tr>
              ) : b.tipo === "fala" ? (
                <tr key={i} className="border-t border-gray-100 align-top">
                  <td className="w-32 whitespace-nowrap px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-brand-700">
                    🎙️ {b.quem}
                  </td>
                  <td className="px-3 py-2 leading-relaxed text-gray-900">
                    {b.texto || "—"}
                  </td>
                </tr>
              ) : (
                <tr key={i} className="border-t border-gray-100 align-top">
                  <td className="w-32 whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    🎬 Cena
                  </td>
                  <td className="px-3 py-2 italic leading-relaxed text-gray-500">
                    {b.texto}
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

  const legendaTexto =
    (caption && caption.trim()) || secoes.legenda.join("\n").trim();

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
