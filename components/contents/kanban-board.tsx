"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { definirStatusConteudoAction } from "@/lib/actions/contents";
import { estiloFormato } from "@/lib/ui/formato";
import { COR_PRIORIDADE } from "@/lib/ui/prioridade";
import { prazoPrincipal, estaAtrasado } from "@/lib/rules/contents";
import { formatarData } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Content, ContentStatus } from "@/types";
import type { OpcaoCliente } from "@/lib/data/contents";

interface Fase {
  chave: string;
  titulo: string;
  entrada: ContentStatus;
  status: ContentStatus[];
}

const FASES: Fase[] = [
  {
    chave: "planejamento",
    titulo: "Planejamento",
    entrada: "Planejamento",
    status: ["Planejamento", "Roteiro pronto"],
  },
  {
    chave: "gravacao",
    titulo: "Gravação",
    entrada: "Aguardando gravação",
    status: ["Aguardando gravação", "Gravado"],
  },
  {
    chave: "edicao",
    titulo: "Edição",
    entrada: "Fila de edição",
    status: ["Fila de edição", "Em edição", "Ajustes"],
  },
  {
    chave: "aprovacao",
    titulo: "Aprovação",
    entrada: "Revisão interna",
    status: ["Revisão interna", "Aprovação do cliente", "Aprovado"],
  },
  {
    chave: "publicacao",
    titulo: "Publicação",
    entrada: "Agendado",
    status: ["Agendado", "Publicado"],
  },
];
const STATUS_ENCERRADOS: ContentStatus[] = ["Pausado", "Cancelado"];

interface KanbanBoardProps {
  contents: Content[];
  clientes: OpcaoCliente[];
}

/** Card de conteúdo dentro do quadro. */
function Card({
  content,
  cliente,
}: {
  content: Content;
  cliente?: OpcaoCliente;
}) {
  const est = estiloFormato(content.format);
  const prazo = prazoPrincipal(content);
  const atrasado = estaAtrasado(content);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: content.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    borderLeftColor: COR_PRIORIDADE[content.priority],
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="cursor-grab touch-none select-none rounded-lg border border-l-4 border-gray-200 bg-white p-2.5 shadow-sm active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <div className="mb-1 flex items-center gap-1.5 text-[11px] text-gray-500">
        <span
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-gray-200"
          style={{ backgroundColor: cliente?.color ?? "#e5e7eb" }}
          aria-hidden="true"
        />
        <span className="truncate">{cliente?.name ?? "—"}</span>
      </div>
      <Link
        href={`/conteudos/${content.id}`}
        onPointerDown={(e) => e.stopPropagation()}
        className="block break-words text-sm font-semibold leading-snug text-gray-900 hover:text-brand-700 hover:underline"
      >
        {content.title}
      </Link>
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <span
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
          style={{ backgroundColor: est.fundo, color: est.texto }}
        >
          <span aria-hidden="true">{est.icone}</span>
          {est.curto}
        </span>
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
          {content.status}
        </span>
      </div>
      {prazo ? (
        <p
          className={cn(
            "mt-1.5 text-[11px]",
            atrasado ? "font-semibold text-red-600" : "text-gray-500",
          )}
        >
          {atrasado ? "⚠ " : "📅 "}
          {formatarData(prazo)}
        </p>
      ) : null}
    </div>
  );
}

/** Coluna (fase) que recebe os cards. */
function Coluna({
  fase,
  itens,
  clientesById,
}: {
  fase: Fase;
  itens: Content[];
  clientesById: Map<string, OpcaoCliente>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: fase.chave });
  return (
    <div className="flex w-[280px] shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-gray-800">{fase.titulo}</h3>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {itens.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[300px] flex-1 flex-col gap-2 rounded-xl border p-2 transition-colors",
          isOver
            ? "border-brand-400 bg-brand-50"
            : "border-gray-200 bg-gray-50/70",
        )}
      >
        {itens.length === 0 ? (
          <span className="mt-4 text-center text-[11px] text-gray-300">
            Arraste um card para cá
          </span>
        ) : (
          itens.map((c) => (
            <Card key={c.id} content={c} cliente={clientesById.get(c.client_id)} />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Quadro Kanban da produção. Colunas por FASE (agrupando os status), com
 * arrastar-e-soltar: soltar um card numa fase muda o status para o status
 * de entrada daquela fase. O status exato aparece no card.
 */
export function KanbanBoard({ contents, clientes }: KanbanBoardProps) {
  const router = useRouter();
  const [itens, setItens] = useState<Content[]>(contents);
  const [pendente, iniciar] = useTransition();
  const [verEncerrados, setVerEncerrados] = useState(false);
  const clientesById = useMemo(
    () => new Map(clientes.map((c) => [c.id, c])),
    [clientes],
  );

  // Só sincroniza com o servidor quando não há save em voo, para não reverter
  // um arraste otimista enquanto outro está sendo persistido.
  useEffect(() => {
    if (!pendente) setItens(contents);
  }, [contents, pendente]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const faseDoStatus = (status: ContentStatus): string | null =>
    FASES.find((f) => f.status.includes(status))?.chave ?? null;

  function aoSoltar(evento: DragEndEvent) {
    const { active, over } = evento;
    if (!over) return;
    const fase = FASES.find((f) => f.chave === String(over.id));
    if (!fase) return;
    const alvo = itens.find((c) => c.id === active.id);
    if (!alvo) return;
    if (faseDoStatus(alvo.status) === fase.chave) return; // já está na fase
    const novo = fase.entrada;
    setItens((l) =>
      l.map((c) => (c.id === active.id ? { ...c, status: novo } : c)),
    );
    iniciar(async () => {
      await definirStatusConteudoAction(String(active.id), novo);
      router.refresh();
    });
  }

  const porFase = (fase: Fase) =>
    itens.filter((c) => fase.status.includes(c.status));
  const encerrados = itens.filter((c) => STATUS_ENCERRADOS.includes(c.status));

  return (
    <DndContext sensors={sensors} onDragEnd={aoSoltar}>
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3">
          {FASES.map((fase) => (
            <Coluna
              key={fase.chave}
              fase={fase}
              itens={porFase(fase)}
              clientesById={clientesById}
            />
          ))}
        </div>
      </div>

      {/* Encerrados (recolhido por padrão) */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setVerEncerrados((v) => !v)}
          className="text-sm font-medium text-gray-500 hover:text-gray-800"
        >
          {verEncerrados ? "▼" : "▶"} Pausados / Cancelados ({encerrados.length})
        </button>
        {verEncerrados ? (
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {encerrados.length === 0 ? (
              <p className="text-xs text-gray-400">Nada por aqui.</p>
            ) : (
              encerrados.map((c) => (
                <Card
                  key={c.id}
                  content={c}
                  cliente={clientesById.get(c.client_id)}
                />
              ))
            )}
          </div>
        ) : null}
      </div>
    </DndContext>
  );
}
