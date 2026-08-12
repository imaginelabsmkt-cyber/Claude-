"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { PriorityBadge, StatusContentBadge } from "@/components/shared/status-badge";
import { formatarData } from "@/lib/utils";
import { toast } from "@/lib/ui/toast";
import { corPrioridade } from "@/lib/ui/prioridade";
import { prazoPrincipal } from "@/lib/rules/contents";
import {
  definirStatusConteudoAction,
  reordenarFilaEdicaoAction,
} from "@/lib/actions/contents";
import type { Content, ContentStatus } from "@/types";
import type { OpcaoCliente } from "@/lib/data/contents";


interface EditQueueProps {
  itens: Content[];
  clientes: OpcaoCliente[];
}

/** Ações contextuais por status (rótulo -> novo status). */
function acoesPara(status: ContentStatus): { label: string; to: ContentStatus }[] {
  switch (status) {
    case "Gravado":
      return [
        { label: "Adicionar à fila", to: "Fila de edição" },
        { label: "Iniciar edição", to: "Em edição" },
      ];
    case "Fila de edição":
      return [{ label: "Iniciar edição", to: "Em edição" }];
    case "Em edição":
      return [
        { label: "Enviar para revisão", to: "Revisão interna" },
        { label: "Marcar como ajuste", to: "Ajustes" },
        { label: "Marcar como aprovado", to: "Aprovado" },
      ];
    case "Ajustes":
      return [
        { label: "Finalizar ajustes", to: "Revisão interna" },
        { label: "Marcar como aprovado", to: "Aprovado" },
      ];
    case "Revisão interna":
      return [
        { label: "Marcar como ajuste", to: "Ajustes" },
        { label: "Marcar como aprovado", to: "Aprovado" },
      ];
    default:
      return [];
  }
}

function ItemFila({
  content,
  posicao,
  cliente,
}: {
  content: Content;
  posicao: number;
  cliente?: OpcaoCliente;
}) {
  const router = useRouter();
  const [processando, iniciar] = useTransition();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: content.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    borderLeftColor: corPrioridade(content.priority),
  };

  function mudarStatus(to: ContentStatus) {
    iniciar(async () => {
      const r = await definirStatusConteudoAction(content.id, to);
      if (!r.ok) toast.erro(r.error ?? "Não foi possível mudar o status.");
      router.refresh();
    });
  }

  const prazo = prazoPrincipal(content);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-l-4 border-gray-200 bg-white p-3 shadow-sm"
    >
      <div className="flex items-center gap-2.5">
        {/* Alça de arraste */}
        <button
          type="button"
          className="shrink-0 cursor-grab touch-none rounded p-1 text-gray-400 hover:bg-gray-100 active:cursor-grabbing"
          aria-label="Arrastar para reordenar"
          {...attributes}
          {...listeners}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
          </svg>
        </button>

        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
          {posicao}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full border border-gray-200"
              style={{ backgroundColor: cliente?.color ?? "#e5e7eb" }}
              aria-hidden="true"
            />
            <span className="truncate">{cliente?.name ?? "—"}</span>
            {prazo ? (
              <span className="shrink-0 text-gray-400">
                · entrega {formatarData(prazo)}
              </span>
            ) : null}
            {content.revision_count > 0 ? (
              <span className="shrink-0 text-amber-600">
                · {content.revision_count} ajuste{content.revision_count > 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
          <Link
            href={`/conteudos/${content.id}`}
            className="block truncate font-medium text-gray-900 hover:text-brand-700"
          >
            {content.title}
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <StatusContentBadge status={content.status} />
          <PriorityBadge priority={content.priority} />
        </div>
      </div>

      {/* Ações + links (compacto) */}
      <div className="mt-2 flex flex-wrap items-center gap-2 pl-[3.25rem]">
        {acoesPara(content.status).map((a) => (
          <Button
            key={a.to + a.label}
            tamanho="sm"
            variante="secundaria"
            disabled={processando}
            onClick={() => mudarStatus(a.to)}
          >
            {a.label}
          </Button>
        ))}
        {content.script_url ? (
          <a href={content.script_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-brand-700 hover:underline">
            Roteiro
          </a>
        ) : null}
        {content.raw_files_url ? (
          <a href={content.raw_files_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-brand-700 hover:underline">
            Brutos
          </a>
        ) : null}
      </div>
    </div>
  );
}

/** Fila de edição com reordenação manual (drag and drop). */
export function EditQueue({ itens, clientes }: EditQueueProps) {
  const [ordem, setOrdem] = useState<Content[]>(itens);
  const [pendente, iniciar] = useTransition();
  const clientesById = new Map(clientes.map((c) => [c.id, c]));

  // Sincroniza com o servidor, mas não durante um salvamento em voo (senão
  // reverte a reordenação otimista antes de ela ser persistida).
  useEffect(() => {
    if (!pendente) setOrdem(itens);
  }, [itens, pendente]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function aoSoltar(evento: DragEndEvent) {
    const { active, over } = evento;
    if (!over || active.id === over.id) return;
    const de = ordem.findIndex((c) => c.id === active.id);
    const para = ordem.findIndex((c) => c.id === over.id);
    if (de < 0 || para < 0) return;
    const nova = arrayMove(ordem, de, para);
    setOrdem(nova); // otimista
    iniciar(async () => {
      const r = await reordenarFilaEdicaoAction(nova.map((c) => c.id));
      if (!r.ok) toast.erro(r.error ?? "Não foi possível salvar a ordem.");
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={aoSoltar}
    >
      <SortableContext
        items={ordem.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {ordem.map((c, i) => (
            <ItemFila
              key={c.id}
              content={c}
              posicao={i + 1}
              cliente={clientesById.get(c.client_id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
