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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PriorityBadge, StatusContentBadge } from "@/components/shared/status-badge";
import { formatarData } from "@/lib/utils";
import { corPrioridade } from "@/lib/ui/prioridade";
import { motivoPrioridade } from "@/lib/rules/contents";
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

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <span className="text-[11px] uppercase tracking-wide text-gray-500">
        {rotulo}
      </span>
      <p className="text-gray-700">{valor}</p>
    </div>
  );
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
      await definirStatusConteudoAction(content.id, to);
      router.refresh();
    });
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-l-4 border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        {/* Alça de arraste */}
        <button
          type="button"
          className="mt-1 cursor-grab touch-none rounded p-1 text-gray-500 hover:bg-gray-100 active:cursor-grabbing"
          aria-label="Arrastar para reordenar"
          {...attributes}
          {...listeners}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
            <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
          </svg>
        </button>

        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
          {posicao}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full border border-gray-200"
                  style={{ backgroundColor: cliente?.color ?? "#e5e7eb" }}
                  aria-hidden="true"
                />
                {cliente?.name ?? "—"}
              </div>
              <Link
                href={`/conteudos/${content.id}`}
                className="mt-0.5 block font-medium text-gray-900 hover:text-brand-700"
              >
                {content.title}
              </Link>
            </div>
            <div className="flex flex-col items-end gap-1">
              <StatusContentBadge status={content.status} />
              <PriorityBadge priority={content.priority} />
              <Badge tom="cinza">{motivoPrioridade(content)}</Badge>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <Campo rotulo="Data prevista" valor={formatarData(content.planned_date)} />
            <Campo rotulo="Prazo de edição" valor={formatarData(content.editing_deadline)} />
            <Campo rotulo="Qtd. de ajustes" valor={String(content.revision_count)} />
            <Campo rotulo="Observações" valor={content.notes ?? "—"} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {content.script_url ? (
              <a href={content.script_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-brand-700 hover:underline">
                Roteiro
              </a>
            ) : null}
            {content.raw_files_url ? (
              <a href={content.raw_files_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-brand-700 hover:underline">
                Arquivos brutos
              </a>
            ) : null}
            <Link href={`/conteudos/${content.id}/editar`} className="text-xs font-medium text-gray-500 hover:underline">
              Editar
            </Link>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
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
          </div>
        </div>
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
      await reordenarFilaEdicaoAction(nova.map((c) => c.id));
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
