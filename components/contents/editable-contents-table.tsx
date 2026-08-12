"use client";

import {
  Fragment,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QuickStatus } from "@/components/contents/quick-status";
import { QuickPriority } from "@/components/contents/quick-priority";
import { ContentActions } from "@/components/contents/content-actions";
import { DeleteClientContentsButton } from "@/components/contents/delete-client-contents-button";
import { EmptyState } from "@/components/shared/empty-state";
import {
  atualizarCampoConteudoAction,
  type ContentEditPatch,
} from "@/lib/actions/contents";
import { toast } from "@/lib/ui/toast";
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
  /** Ação exibida no estado vazio (ex.: botão "+ Novo conteúdo"). */
  acaoVazio?: ReactNode;
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

/** Hook simples de salvamento de um campo com refresh + aviso (toast). */
function useSalvar() {
  const router = useRouter();
  const [salvando, iniciar] = useTransition();
  const salvar = (id: string, patch: ContentEditPatch) =>
    iniciar(async () => {
      const r = await atualizarCampoConteudoAction(id, patch);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível salvar.");
        router.refresh();
        return;
      }
      toast.sucesso("Salvo");
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

// Controle "fantasma": aparece como texto e só ganha moldura ao passar o
// mouse / focar — evita a "parede de caixas" que polui a leitura.
const CLASSE_SELECT =
  "w-full max-w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-xs text-gray-800 outline-none hover:border-gray-300 hover:bg-white focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500 disabled:opacity-60";

const NUM_COLUNAS = 8;

/** Linha da planilha. */
function Linha({ content, perfis }: { content: Content; perfis: Profile[] }) {
  const { salvar, salvando } = useSalvar();
  const est = estiloFormato(content.format);
  const campoResp = campoResponsavel(content.status);
  const respAtual = (content[campoResp] as string | null) ?? "";

  return (
    <tr className="align-middle hover:bg-gray-50/60">
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
          className={cn(CLASSE_SELECT, "font-medium")}
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
          className={cn(CLASSE_SELECT, "w-14")}
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
          className={cn(CLASSE_SELECT, "w-[8.5rem] text-gray-600")}
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

      {/* Ações (⋮): abrir / editar / excluir */}
      <td className="px-2 py-1.5 text-right">
        <ContentActions id={content.id} status={content.status} soMenu />
      </td>
    </tr>
  );
}

/** Cabeçalho de grupo (um cliente) dentro da planilha. */
function CabecalhoGrupo({
  clientId,
  cliente,
  quantidade,
}: {
  clientId: string;
  cliente?: OpcaoCliente;
  quantidade: number;
}) {
  return (
    <tr className="border-t border-gray-200 bg-gray-50/80">
      <td colSpan={NUM_COLUNAS} className="px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-full border border-gray-200"
              style={{ backgroundColor: cliente?.color ?? "#e5e7eb" }}
              aria-hidden="true"
            />
            {cliente?.name ?? "Sem cliente"}
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600">
              {quantidade}
            </span>
          </span>
          <DeleteClientContentsButton
            clientId={clientId}
            nome={cliente?.name ?? "este cliente"}
            quantidade={quantidade}
          />
        </div>
      </td>
    </tr>
  );
}

/**
 * Planilha editável de conteúdos: cada célula é editável na hora
 * (título, formato, semana, data, status, prioridade, responsável) e há um
 * menu ⋮ por linha (abrir/editar/excluir). Na lista geral, os conteúdos
 * ficam agrupados por cliente.
 */
export function EditableContentsTable({
  contents,
  clientes,
  perfis,
  mostrarCliente = true,
  vazioTitulo = "Nenhum conteúdo",
  vazioDescricao = "Cadastre ou importe um planejamento para começar.",
  acaoVazio,
}: EditableContentsTableProps) {
  if (contents.length === 0) {
    return (
      <EmptyState
        titulo={vazioTitulo}
        descricao={vazioDescricao}
        acao={acaoVazio}
      />
    );
  }
  const clientesById = new Map(clientes.map((c) => [c.id, c]));

  // Agrupa por cliente (só na lista geral). Ordena por nome do cliente e,
  // dentro do cliente, por data prevista.
  const grupos = new Map<string, Content[]>();
  for (const c of contents) {
    const lista = grupos.get(c.client_id) ?? [];
    lista.push(c);
    grupos.set(c.client_id, lista);
  }
  const gruposOrdenados = [...grupos.entries()]
    .map(([clientId, itens]) => ({
      clientId,
      cliente: clientesById.get(clientId),
      itens: itens.sort((a, b) =>
        (a.planned_date ?? "9999").localeCompare(b.planned_date ?? "9999"),
      ),
    }))
    .sort((a, b) =>
      (a.cliente?.name ?? "").localeCompare(b.cliente?.name ?? ""),
    );

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[820px] border-collapse text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
          <tr>
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
          {mostrarCliente
            ? gruposOrdenados.map((g) => (
                <Fragment key={g.clientId}>
                  <CabecalhoGrupo
                    clientId={g.clientId}
                    cliente={g.cliente}
                    quantidade={g.itens.length}
                  />
                  {g.itens.map((c) => (
                    <Linha key={c.id} content={c} perfis={perfis} />
                  ))}
                </Fragment>
              ))
            : contents.map((c) => (
                <Linha key={c.id} content={c} perfis={perfis} />
              ))}
        </tbody>
      </table>
    </div>
  );
}
