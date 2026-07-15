"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QuickStatus } from "@/components/contents/quick-status";
import { QuickPriority } from "@/components/contents/quick-priority";
import { EmptyState } from "@/components/shared/empty-state";
import {
  atualizarCampoConteudoAction,
  type ContentEditPatch,
} from "@/lib/actions/contents";
import { estiloFormato } from "@/lib/ui/formato";
import { FORMAT_OPTIONS, WEEK_OPTIONS, type ContentStatus } from "@/types";
import type { Content, Profile } from "@/types";
import type { OpcaoCliente } from "@/lib/data/contents";
import { cn } from "@/lib/utils";

interface EditableContentsTableProps {
  contents: Content[];
  clientes: OpcaoCliente[];
  perfis: Profile[];
  /** Mostra a coluna de cliente (útil na lista geral; dispensável na do cliente). */
  mostrarCliente?: boolean;
  vazioTitulo?: string;
  vazioDescricao?: string;
}

/** Campo de responsável conforme a etapa (status) do conteúdo. */
function campoResponsavel(status: ContentStatus): keyof ContentEditPatch {
  switch (status) {
    case "Aguardando gravação":
    case "Gravado":
      return "recorder_id";
    case "Fila de edição":
    case "Em edição":
    case "Revisão interna":
    case "Ajustes":
      return "editor_id";
    case "Aprovado":
    case "Agendado":
    case "Publicado":
    case "Aprovação do cliente":
      return "publisher_id";
    default:
      return "planner_id"; // Planejamento, Roteiro pronto, Pausado, Cancelado
  }
}

/** Hook simples de salvamento de um campo com refresh. */
function useSalvar() {
  const router = useRouter();
  const [salvando, iniciar] = useTransition();
  const salvar = (id: string, patch: ContentEditPatch) =>
    iniciar(async () => {
      await atualizarCampoConteudoAction(id, patch);
      router.refresh();
    });
  return { salvar, salvando };
}

/**
 * Célula do título: o texto é um link que ABRE o conteúdo; um lápis ao lado
 * troca para edição inline (salva ao sair/Enter).
 */
function CelulaTitulo({
  href,
  valor,
  onSalvar,
}: {
  href: string;
  valor: string;
  onSalvar: (novo: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(valor);
  useEffect(() => setTexto(valor), [valor]);

  if (editando) {
    return (
      <input
        autoFocus
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => {
          setEditando(false);
          if (texto.trim() && texto !== valor) onSalvar(texto.trim());
          else setTexto(valor);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setTexto(valor);
            setEditando(false);
          }
        }}
        className="w-full rounded border border-brand-400 px-1 py-0.5 text-sm outline-none focus:ring-1 focus:ring-brand-500"
      />
    );
  }
  return (
    <span className="group flex items-center gap-1.5">
      <Link
        href={href}
        className="font-medium text-gray-900 hover:text-brand-700 hover:underline"
      >
        {valor}
      </Link>
      <button
        type="button"
        onClick={() => setEditando(true)}
        aria-label="Editar título"
        title="Editar título"
        className="shrink-0 rounded p-0.5 text-gray-300 hover:bg-gray-100 hover:text-brand-600 group-hover:text-gray-400"
      >
        ✎
      </button>
    </span>
  );
}

const CLASSE_SELECT =
  "w-full rounded-md border border-gray-300 bg-white px-1.5 py-1 text-xs text-gray-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-60";

/** Linha da planilha. */
function Linha({
  content,
  cliente,
  perfis,
  mostrarCliente,
}: {
  content: Content;
  cliente?: OpcaoCliente;
  perfis: Profile[];
  mostrarCliente: boolean;
}) {
  const { salvar, salvando } = useSalvar();
  const est = estiloFormato(content.format);
  const campoResp = campoResponsavel(content.status);
  const respAtual = (content[campoResp] as string | null) ?? "";

  return (
    <tr className="align-middle hover:bg-gray-50/60">
      {mostrarCliente ? (
        <td className="px-2 py-1.5">
          <span className="flex items-center gap-1.5 text-gray-700">
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-full border border-gray-200"
              style={{ backgroundColor: cliente?.color ?? "#e5e7eb" }}
              aria-hidden="true"
            />
            <span className="truncate">{cliente?.name ?? "—"}</span>
          </span>
        </td>
      ) : null}

      {/* Título (link para abrir + lápis para editar) */}
      <td className="min-w-[200px] px-2 py-1.5">
        <CelulaTitulo
          href={`/conteudos/${content.id}`}
          valor={content.title}
          onSalvar={(novo) => salvar(content.id, { title: novo })}
        />
      </td>

      {/* Formato */}
      <td className="px-2 py-1.5">
        <select
          aria-label="Formato"
          value={content.format ?? ""}
          disabled={salvando}
          onChange={(e) =>
            salvar(content.id, { format: e.target.value || null })
          }
          className={CLASSE_SELECT}
          style={{ color: est.texto }}
        >
          <option value="">—</option>
          {FORMAT_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </td>

      {/* Semana */}
      <td className="px-2 py-1.5">
        <select
          aria-label="Semana"
          value={content.planned_week ?? ""}
          disabled={salvando}
          onChange={(e) =>
            salvar(content.id, {
              planned_week: e.target.value ? Number(e.target.value) : null,
            })
          }
          className={cn(CLASSE_SELECT, "w-16")}
        >
          <option value="">—</option>
          {WEEK_OPTIONS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </td>

      {/* Data prevista */}
      <td className="px-2 py-1.5">
        <input
          type="date"
          aria-label="Data prevista"
          value={content.planned_date ?? ""}
          disabled={salvando}
          onChange={(e) =>
            salvar(content.id, { planned_date: e.target.value || null })
          }
          className={cn(CLASSE_SELECT, "w-[8.5rem]")}
        />
      </td>

      {/* Status */}
      <td className="px-2 py-1.5">
        <QuickStatus id={content.id} status={content.status} />
      </td>

      {/* Prioridade */}
      <td className="px-2 py-1.5">
        <QuickPriority id={content.id} priority={content.priority} />
      </td>

      {/* Responsável (campo conforme a etapa) */}
      <td className="px-2 py-1.5">
        <select
          aria-label="Responsável"
          value={respAtual}
          disabled={salvando}
          onChange={(e) =>
            salvar(content.id, {
              [campoResp]: e.target.value || null,
            } as ContentEditPatch)
          }
          className={CLASSE_SELECT}
        >
          <option value="">—</option>
          {perfis.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </td>

      {/* Abrir */}
      <td className="px-2 py-1.5 text-right">
        <Link
          href={`/conteudos/${content.id}`}
          className="text-xs font-medium text-brand-700 hover:underline"
        >
          Abrir
        </Link>
      </td>
    </tr>
  );
}

/**
 * Planilha editável de conteúdos: cada célula é editável na hora
 * (título, formato, semana, data, status, prioridade, responsável),
 * sem precisar abrir o conteúdo. Salva no banco a cada mudança.
 */
export function EditableContentsTable({
  contents,
  clientes,
  perfis,
  mostrarCliente = true,
  vazioTitulo = "Nenhum conteúdo",
  vazioDescricao = "Cadastre ou importe um planejamento para começar.",
}: EditableContentsTableProps) {
  if (contents.length === 0) {
    return <EmptyState titulo={vazioTitulo} descricao={vazioDescricao} />;
  }
  const clientesById = new Map(clientes.map((c) => [c.id, c]));

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[860px] border-collapse text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
          <tr>
            {mostrarCliente ? (
              <th className="px-2 py-2 font-semibold">Cliente</th>
            ) : null}
            <th className="px-2 py-2 font-semibold">Conteúdo</th>
            <th className="px-2 py-2 font-semibold">Formato</th>
            <th className="px-2 py-2 font-semibold">Sem.</th>
            <th className="px-2 py-2 font-semibold">Data</th>
            <th className="px-2 py-2 font-semibold">Status</th>
            <th className="px-2 py-2 font-semibold">Prioridade</th>
            <th className="px-2 py-2 font-semibold">Responsável</th>
            <th className="px-2 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {contents.map((c) => (
            <Linha
              key={c.id}
              content={c}
              cliente={clientesById.get(c.client_id)}
              perfis={perfis}
              mostrarCliente={mostrarCliente}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
