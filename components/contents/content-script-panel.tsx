"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  atualizarRoteiroAction,
  atualizarLegendaAction,
} from "@/lib/actions/contents";
import { toast } from "@/lib/ui/toast";
import { ehArte } from "@/lib/rules/contents";

interface ContentScriptPanelProps {
  id: string;
  script: string | null;
  caption: string | null;
  format?: string | null;
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

/** Botão pequeno padrão (Editar/Salvar/Cancelar). */
function BotaoSec({
  children,
  onClick,
  disabled,
  variante = "borda",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variante?: "borda" | "primario";
}) {
  const base =
    variante === "primario"
      ? "rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      : "rounded-md border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60";
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={base}>
      {children}
    </button>
  );
}

const LIMITE_PREVIA = 4;

/**
 * Tabela de leitura do roteiro/layout: uma coluna com o rótulo (FALA,
 * LETTERING, ou o elemento da arte) e outra com o conteúdo. Mesma estrutura
 * do modo de edição, para o roteiro sempre aparecer em TABELA (não em lista).
 * Tem versão curta que expande.
 */
function TabelaRoteiro({
  linhas,
  colEsquerda,
  colDireita,
}: {
  linhas: LinhaEdicao[];
  colEsquerda: string;
  colDireita: string;
}) {
  const [aberto, setAberto] = useState(false);
  const visiveis = aberto ? linhas : linhas.slice(0, LIMITE_PREVIA);
  const restantes = linhas.length - LIMITE_PREVIA;

  // Sem nenhum rótulo (ex.: layout de arte só com conteúdo) => uma coluna só.
  const temEsquerda = linhas.some((l) => l.rotulo.trim() !== "");

  const botaoExpandir =
    restantes > 0 ? (
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="mt-2 text-xs font-semibold text-brand-700 hover:underline"
      >
        {aberto ? "Recolher ▲" : `Ver completo (+${restantes}) ▼`}
      </button>
    ) : null;

  if (!temEsquerda) {
    return (
      <div>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-brand-50 text-[11px] font-bold uppercase tracking-wider text-brand-700">
                <th className="px-3 py-2">{colDireita}</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((l, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="break-words px-3 py-2 leading-relaxed text-gray-800">
                    {l.conteudo || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {botaoExpandir}
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead>
            <tr className="bg-brand-50 text-[11px] font-bold uppercase tracking-wider text-brand-700">
              <th className="w-40 border-r border-brand-100 px-3 py-2">
                {colEsquerda}
              </th>
              <th className="px-3 py-2">{colDireita}</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((l, i) => (
              <tr key={i} className="border-t border-gray-100 align-top">
                <td className="break-words border-r border-gray-100 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-brand-600">
                  {l.rotulo || ""}
                </td>
                <td className="break-words px-3 py-2 leading-relaxed text-gray-800">
                  {l.conteudo || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {botaoExpandir}
    </div>
  );
}

/** Leitura grande do roteiro/layout (para gravação ou criação, tela cheia). */
function LeituraGrande({ blocos }: { blocos: Bloco[] }) {
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      {blocos.map((b, i) =>
        b.tipo === "titulo" ? (
          <p
            key={i}
            className="border-b border-gray-200 pb-1 text-sm font-bold uppercase tracking-wider text-brand-700"
          >
            {b.texto}
          </p>
        ) : b.tipo === "fala" ? (
          <div key={i}>
            {b.quem ? (
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-brand-600">
                🎙️ {b.quem}
              </span>
            ) : null}
            <p className="text-2xl leading-relaxed text-gray-900">{b.texto}</p>
          </div>
        ) : (
          <p
            key={i}
            className="border-l-2 border-gray-200 pl-3 text-lg italic leading-relaxed text-gray-500"
          >
            {b.texto}
          </p>
        ),
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Edição do roteiro/layout em TABELA (rótulo + conteúdo por linha)
// -------------------------------------------------------------
type LinhaEdicao = { rotulo: string; conteudo: string };

/** Divide cada linha em rótulo (antes do ":") + conteúdo, sem perder nada. */
function parseParaEdicao(linhas: string[]): LinhaEdicao[] {
  return linhas.map((l) => {
    const idx = l.indexOf(":");
    // Só vira rótulo quando a parte antes do ":" é curta (não corta frases).
    if (idx > 0 && idx <= 24) {
      return { rotulo: l.slice(0, idx).trim(), conteudo: l.slice(idx + 1).trim() };
    }
    return { rotulo: "", conteudo: l.trim() };
  });
}

/** Remonta as linhas de texto a partir da tabela editável. */
function serializarEdicao(linhas: LinhaEdicao[]): string {
  return linhas
    .map(({ rotulo, conteudo }) => {
      const r = rotulo.trim();
      const c = conteudo.trim();
      if (!r && !c) return "";
      return r ? `${r}: ${c}` : c;
    })
    .filter(Boolean)
    .join("\n");
}

function TabelaEdicao({
  linhas,
  onCampo,
  onAdd,
  onRemove,
  colEsquerda,
  colDireita,
  grande = false,
}: {
  linhas: LinhaEdicao[];
  onCampo: (i: number, campo: "rotulo" | "conteudo", valor: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  colEsquerda: string;
  colDireita: string;
  grande?: boolean;
}) {
  const txt = grande ? "text-base" : "text-sm";
  return (
    <div className="overflow-hidden rounded-lg border border-brand-300">
      <table className="w-full table-fixed border-collapse text-left">
        <thead>
          <tr className="bg-brand-50 text-[11px] font-bold uppercase tracking-wider text-brand-700">
            <th className="w-40 border-r border-brand-100 px-2 py-2">
              {colEsquerda}
            </th>
            <th className="px-2 py-2">{colDireita}</th>
            <th className="w-9" />
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i} className="border-t border-gray-100 align-top">
              <td className="border-r border-gray-100 p-1">
                <input
                  value={l.rotulo}
                  onChange={(e) => onCampo(i, "rotulo", e.target.value)}
                  placeholder="—"
                  className="w-full rounded border border-transparent px-1.5 py-1 text-xs font-semibold uppercase text-brand-700 outline-none hover:border-gray-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </td>
              <td className="p-1">
                <textarea
                  value={l.conteudo}
                  onChange={(e) => onCampo(i, "conteudo", e.target.value)}
                  rows={grande ? 3 : 2}
                  className={`w-full resize-y rounded border border-transparent px-1.5 py-1 ${txt} leading-relaxed text-gray-800 outline-none hover:border-gray-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500`}
                />
              </td>
              <td className="p-1 text-center">
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  title="Remover linha"
                  className="rounded px-1.5 py-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-gray-100 p-2">
        <button
          type="button"
          onClick={onAdd}
          className="text-xs font-semibold text-brand-700 hover:underline"
        >
          + Adicionar linha
        </button>
      </div>
    </div>
  );
}

/**
 * Bloco do roteiro/layout com botões de EDITAR (em tabela) e TELA CHEIA.
 * A edição altera o texto do roteiro preservando legenda/stories.
 */
function RoteiroEditavel({
  id,
  roteiroLinhas,
  blocos,
  legenda,
  stories,
  arte,
}: {
  id: string;
  roteiroLinhas: string[];
  blocos: Bloco[];
  legenda: string[];
  stories: string[];
  arte: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [telaCheia, setTelaCheia] = useState(false);
  const [linhas, setLinhas] = useState<LinhaEdicao[]>(() =>
    parseParaEdicao(roteiroLinhas),
  );
  const [salvando, iniciar] = useTransition();

  useEffect(() => setLinhas(parseParaEdicao(roteiroLinhas)), [roteiroLinhas]);

  const titulo = arte ? "Layout das artes" : "Roteiro";
  const colEsquerda = arte ? "Elemento" : "OFF / Lettering";
  const colDireita = arte ? "Conteúdo" : "Cenas";

  // Remonta o texto completo preservando LEGENDA e STORIES.
  const remontar = (roteiro: string): string => {
    const partes = [roteiro.trim()];
    if (legenda.length) partes.push(`LEGENDA: ${legenda.join("\n")}`);
    if (stories.length)
      partes.push(`DIRECIONAMENTO DE STORIES\n${stories.join("\n")}`);
    return partes.filter(Boolean).join("\n");
  };

  const salvar = () =>
    iniciar(async () => {
      const r = await atualizarRoteiroAction(
        id,
        remontar(serializarEdicao(linhas)),
      );
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível salvar.");
        return;
      }
      toast.sucesso(arte ? "Layout salvo" : "Roteiro salvo");
      setEditando(false);
      router.refresh();
    });

  const iniciarEdicao = () => {
    setLinhas(parseParaEdicao(roteiroLinhas));
    setEditando(true);
  };

  const onCampo = (i: number, campo: "rotulo" | "conteudo", valor: string) =>
    setLinhas((ls) =>
      ls.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)),
    );
  const onRemove = (i: number) =>
    setLinhas((ls) => ls.filter((_, idx) => idx !== i));
  const onAdd = () =>
    setLinhas((ls) => [...ls, { rotulo: "", conteudo: "" }]);

  const Botoes = ({ compacto = false }: { compacto?: boolean }) =>
    editando ? (
      <div className="flex items-center gap-2">
        <BotaoSec variante="primario" onClick={salvar} disabled={salvando}>
          Salvar
        </BotaoSec>
        <BotaoSec onClick={() => setEditando(false)}>Cancelar</BotaoSec>
      </div>
    ) : (
      <div className="flex items-center gap-2">
        <BotaoSec onClick={iniciarEdicao}>✎ Editar</BotaoSec>
        {compacto ? null : (
          <BotaoSec onClick={() => setTelaCheia(true)}>⛶ Tela cheia</BotaoSec>
        )}
      </div>
    );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">{titulo}</h2>
        <Botoes />
      </div>

      {editando ? (
        <TabelaEdicao
          linhas={linhas}
          onCampo={onCampo}
          onAdd={onAdd}
          onRemove={onRemove}
          colEsquerda={colEsquerda}
          colDireita={colDireita}
        />
      ) : (
        arte ? (
          <TabelaRoteiro
            linhas={parseParaEdicao(roteiroLinhas)}
            colEsquerda={colEsquerda}
            colDireita={colDireita}
          />
        ) : (
          <TabelaRoteiro
            linhas={parseParaEdicao(roteiroLinhas).map((l) => ({
              rotulo: l.rotulo || "CENA",
              conteudo: l.conteudo,
            }))}
            colEsquerda="Tipo"
            colDireita="Texto"
          />
        )
      )}

      {/* Overlay de tela cheia (gravação / criação) */}
      {telaCheia ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h2 className="text-base font-bold text-gray-900">
              {titulo} {editando ? "(editando)" : ""}
            </h2>
            <div className="flex items-center gap-2">
              <Botoes compacto />
              <button
                type="button"
                onClick={() => {
                  setEditando(false);
                  setTelaCheia(false);
                }}
                className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-700"
              >
                ✕ Fechar
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {editando ? (
              <div className="mx-auto max-w-3xl p-4">
                <TabelaEdicao
                  linhas={linhas}
                  onCampo={onCampo}
                  onAdd={onAdd}
                  onRemove={onRemove}
                  colEsquerda={colEsquerda}
                  colDireita={colDireita}
                  grande
                />
              </div>
            ) : (
              <LeituraGrande blocos={blocos} />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Legenda pronta para copiar e também editável. */
function LegendaEditavel({
  id,
  textoInicial,
}: {
  id: string;
  textoInicial: string;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(textoInicial);
  const [salvando, iniciar] = useTransition();

  useEffect(() => setRascunho(textoInicial), [textoInicial]);

  const salvar = () =>
    iniciar(async () => {
      const r = await atualizarLegendaAction(id, rascunho);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível salvar a legenda.");
        return;
      }
      toast.sucesso("Legenda salva");
      setEditando(false);
      router.refresh();
    });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">Legenda</h2>
        {editando ? (
          <div className="flex items-center gap-2">
            <BotaoSec variante="primario" onClick={salvar} disabled={salvando}>
              Salvar
            </BotaoSec>
            <BotaoSec
              onClick={() => {
                setRascunho(textoInicial);
                setEditando(false);
              }}
            >
              Cancelar
            </BotaoSec>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <BotaoSec onClick={() => setEditando(true)}>✎ Editar</BotaoSec>
            <BotaoCopiar texto={textoInicial} rotulo="Copiar legenda" />
          </div>
        )}
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {editando ? (
          <textarea
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            className="min-h-[220px] w-full rounded-lg border border-brand-400 p-3 text-sm leading-relaxed text-gray-800 outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Escreva a legenda para postagem..."
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
            {textoInicial}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Painel de roteiro/layout + legenda + stories de um conteúdo.
 * - Legenda sempre visível, pronta para copiar e editável.
 * - Roteiro (ou "Layout das artes", quando for arte) em tabela, editável e
 *   com modo tela cheia.
 * - Direcionamento de stories separado em tabela própria.
 */
export function ContentScriptPanel({
  id,
  script,
  caption,
  format,
}: ContentScriptPanelProps) {
  const arte = ehArte(format);
  const secoes = useMemo(
    () =>
      script ? separarSecoes(script) : { roteiro: [], legenda: [], stories: [] },
    [script],
  );
  const blocos = useMemo(() => interpretar(secoes.roteiro), [secoes.roteiro]);

  const legendaTexto = formatarLegenda(
    (caption && caption.trim()) || secoes.legenda.join("\n").trim(),
  );

  const temAlgo = blocos.length > 0 || legendaTexto.length > 0;
  if (!temAlgo) return null;

  return (
    <div className="mt-6 space-y-6">
      {/* Legenda — sempre visível, pronta para copiar e editável */}
      {legendaTexto ? <LegendaEditavel id={id} textoInicial={legendaTexto} /> : null}

      {/* Roteiro / Layout das artes — tabela, editável e com tela cheia */}
      {blocos.length > 0 ? (
        <RoteiroEditavel
          id={id}
          roteiroLinhas={secoes.roteiro}
          blocos={blocos}
          legenda={secoes.legenda}
          stories={secoes.stories}
          arte={arte}
        />
      ) : null}

    </div>
  );
}
