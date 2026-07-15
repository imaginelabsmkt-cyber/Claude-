"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  atualizarProducaoConteudoAction,
  type ContentStagePatch,
} from "@/lib/actions/contents";
import type { Content, ContentStatus } from "@/types";
import { cn } from "@/lib/utils";

type Etapa = "gravacao" | "edicao" | "postagem";

/** Descobre a etapa atual pelo status. */
function etapaDoStatus(status: ContentStatus): Etapa | null {
  switch (status) {
    case "Aguardando gravação":
    case "Gravado":
      return "gravacao";
    case "Fila de edição":
    case "Em edição":
    case "Revisão interna":
    case "Ajustes":
      return "edicao";
    case "Aprovação do cliente":
    case "Aprovado":
    case "Agendado":
    case "Publicado":
      return "postagem";
    default:
      return null; // Planejamento, Roteiro pronto, Pausado, Cancelado
  }
}

function useSalvar() {
  const router = useRouter();
  const [salvando, iniciar] = useTransition();
  const salvar = (id: string, patch: ContentStagePatch) =>
    iniciar(async () => {
      await atualizarProducaoConteudoAction(id, patch);
      router.refresh();
    });
  return { salvar, salvando };
}

const CLASSE_INPUT =
  "w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-60";

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-1 block text-xs font-medium text-gray-500">
          {label}
        </span>
      ) : null}
      {children}
    </label>
  );
}

/** Botão de copiar o link de referência, com feedback. */
function CopiarReferencia({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1600);
        } catch {
          setCopiado(false);
        }
      }}
      className="rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
    >
      {copiado ? "✓ Copiado" : "📋 Copiar"}
    </button>
  );
}

function CampoData({
  label,
  valor,
  disabled,
  onSalvar,
}: {
  label: string;
  valor: string | null;
  disabled: boolean;
  onSalvar: (v: string | null) => void;
}) {
  return (
    <Campo label={label}>
      <input
        type="date"
        defaultValue={valor ?? ""}
        disabled={disabled}
        onChange={(e) => onSalvar(e.target.value || null)}
        className={CLASSE_INPUT}
      />
    </Campo>
  );
}

function CampoTexto({
  label,
  valor,
  disabled,
  tipo = "text",
  placeholder,
  onSalvar,
}: {
  label: string;
  valor: string | null;
  disabled: boolean;
  tipo?: "text" | "url";
  placeholder?: string;
  onSalvar: (v: string | null) => void;
}) {
  const [texto, setTexto] = useState(valor ?? "");
  useEffect(() => setTexto(valor ?? ""), [valor]);
  return (
    <Campo label={label}>
      <input
        type={tipo}
        value={texto}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => {
          if ((texto || null) !== (valor || null)) onSalvar(texto || null);
        }}
        className={CLASSE_INPUT}
      />
    </Campo>
  );
}

function CampoLista({
  label,
  valor,
  disabled,
  placeholder,
  onSalvar,
}: {
  label: string;
  valor: string[];
  disabled: boolean;
  placeholder?: string;
  onSalvar: (v: string[]) => void;
}) {
  const [texto, setTexto] = useState(valor.join(", "));
  useEffect(() => setTexto(valor.join(", ")), [valor]);
  return (
    <Campo label={label}>
      <input
        type="text"
        value={texto}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => {
          const lista = texto
            .split(/[,\n]/)
            .map((s) => s.trim())
            .filter(Boolean);
          if (lista.join("|") !== valor.join("|")) onSalvar(lista);
        }}
        className={CLASSE_INPUT}
      />
      <span className="mt-0.5 block text-[11px] text-gray-400">
        Separe por vírgula.
      </span>
    </Campo>
  );
}

function Painel({
  titulo,
  emoji,
  atual,
  abertoInicial,
  children,
}: {
  titulo: string;
  emoji: string;
  atual: boolean;
  abertoInicial: boolean;
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(abertoInicial);
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border shadow-sm",
        atual ? "border-brand-300 ring-1 ring-brand-200" : "border-gray-200",
      )}
    >
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between px-4 py-3 text-left",
          atual ? "bg-brand-50" : "bg-white",
        )}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <span aria-hidden="true">{emoji}</span>
          {titulo}
          {atual ? (
            <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Etapa atual
            </span>
          ) : null}
        </span>
        <span className="text-gray-400">{aberto ? "▲" : "▼"}</span>
      </button>
      {aberto ? (
        <div className="border-t border-gray-100 bg-white p-4">{children}</div>
      ) : null}
    </div>
  );
}

/**
 * Painéis de produção por etapa (gravação / edição / postagem). Cada painel
 * traz só os campos daquela etapa e salva na hora. A etapa atual (pelo
 * status) já vem aberta e destacada, para preencher o que importa agora.
 */
export function ProductionStages({ content }: { content: Content }) {
  const { salvar, salvando } = useSalvar();
  const etapa = etapaDoStatus(content.status);
  const set = (patch: ContentStagePatch) => salvar(content.id, patch);

  return (
    <div className="mt-6 space-y-3">
      <h2 className="text-sm font-semibold text-gray-900">Produção por etapa</h2>

      {/* REFERÊNCIA — em destaque, usada na gravação e na edição */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
            <span aria-hidden="true">🔗</span> Referência (Instagram / TikTok)
          </span>
          {content.reference_url ? (
            <div className="flex items-center gap-2">
              <a
                href={content.reference_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
              >
                ↗ Abrir
              </a>
              <CopiarReferencia url={content.reference_url} />
            </div>
          ) : null}
        </div>
        <CampoTexto
          label=""
          valor={content.reference_url}
          disabled={salvando}
          tipo="url"
          placeholder="Cole aqui o link da referência"
          onSalvar={(v) => set({ reference_url: v })}
        />
      </div>

      {/* GRAVAÇÃO */}
      <Painel
        titulo="Gravação"
        emoji="🎥"
        atual={etapa === "gravacao"}
        abertoInicial
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CampoData
            label="Data de gravação"
            valor={content.recording_date}
            disabled={salvando}
            onSalvar={(v) => set({ recording_date: v })}
          />
          <CampoData
            label="Prazo da gravação"
            valor={content.recording_deadline}
            disabled={salvando}
            onSalvar={(v) => set({ recording_deadline: v })}
          />
          <CampoTexto
            label="Local"
            valor={content.recording_location}
            disabled={salvando}
            placeholder="Onde vai gravar"
            onSalvar={(v) => set({ recording_location: v })}
          />
          <CampoTexto
            label="Roupa"
            valor={content.outfit}
            disabled={salvando}
            placeholder="O que vestir"
            onSalvar={(v) => set({ outfit: v })}
          />
          <CampoLista
            label="Participantes"
            valor={content.participants}
            disabled={salvando}
            placeholder="Ex.: Beatriz, equipe"
            onSalvar={(v) => set({ participants: v })}
          />
          <CampoLista
            label="Materiais"
            valor={content.required_materials}
            disabled={salvando}
            placeholder="Ex.: tripé, microfone"
            onSalvar={(v) => set({ required_materials: v })}
          />
        </div>
      </Painel>

      {/* EDIÇÃO */}
      <Painel
        titulo="Edição"
        emoji="✂️"
        atual={etapa === "edicao"}
        abertoInicial
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CampoData
            label="Prazo da edição"
            valor={content.editing_deadline}
            disabled={salvando}
            onSalvar={(v) => set({ editing_deadline: v })}
          />
          <CampoTexto
            label="Link do roteiro"
            valor={content.script_url}
            disabled={salvando}
            tipo="url"
            placeholder="https://"
            onSalvar={(v) => set({ script_url: v })}
          />
          <CampoTexto
            label="Arquivos brutos"
            valor={content.raw_files_url}
            disabled={salvando}
            tipo="url"
            placeholder="https://"
            onSalvar={(v) => set({ raw_files_url: v })}
          />
          <CampoTexto
            label="Arquivo editado"
            valor={content.edited_file_url}
            disabled={salvando}
            tipo="url"
            placeholder="https://"
            onSalvar={(v) => set({ edited_file_url: v })}
          />
        </div>
      </Painel>

      {/* POSTAGEM */}
      <Painel
        titulo="Postagem"
        emoji="🚀"
        atual={etapa === "postagem"}
        abertoInicial
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CampoTexto
            label="Link publicado"
            valor={content.published_url}
            disabled={salvando}
            tipo="url"
            placeholder="https://"
            onSalvar={(v) => set({ published_url: v })}
          />
          <CampoData
            label="Data real da postagem"
            valor={content.actual_post_date}
            disabled={salvando}
            onSalvar={(v) => set({ actual_post_date: v })}
          />
        </div>
      </Painel>
    </div>
  );
}
