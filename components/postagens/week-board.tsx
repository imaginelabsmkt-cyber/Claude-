"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { StatusContentBadge, PriorityBadge } from "@/components/shared/status-badge";
import { ehArte } from "@/lib/rules/contents";
import { alterarDataPostagemAction } from "@/lib/actions/contents";
import { formatarData } from "@/lib/utils";
import { toast } from "@/lib/ui/toast";
import { cn } from "@/lib/utils";
import type { Content } from "@/types";
import type { OpcaoCliente } from "@/lib/data/contents";

interface Dia {
  iso: string;
  rotulo: string;
  diaSemana: string;
  hoje: boolean;
}
interface WeekBoardProps {
  dias: Dia[];
  contents: Content[];
  clientes: OpcaoCliente[];
}

function Cartao({
  content,
  cliente,
}: {
  content: Content;
  cliente?: OpcaoCliente;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: content.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-md border bg-white p-2 shadow-sm",
        isDragging
          ? "border-brand-400 ring-2 ring-brand-200"
          : "border-gray-200",
      )}
    >
      <div className="flex items-center gap-1 text-[11px] text-gray-500">
        {/* Alça de arrastar: só ela move o card (evita conflito com o link). */}
        <button
          type="button"
          className="-ml-1 flex cursor-grab touch-none items-center rounded px-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 active:cursor-grabbing"
          aria-label="Arraste para mudar a data"
          title="Arraste para mudar a data"
          {...attributes}
          {...listeners}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <circle cx="7" cy="5" r="1.4" />
            <circle cx="13" cy="5" r="1.4" />
            <circle cx="7" cy="10" r="1.4" />
            <circle cx="13" cy="10" r="1.4" />
            <circle cx="7" cy="15" r="1.4" />
            <circle cx="13" cy="15" r="1.4" />
          </svg>
        </button>
        <span
          className="inline-block h-2 w-2 rounded-full border border-gray-200"
          style={{ backgroundColor: cliente?.color ?? "#e5e7eb" }}
          aria-hidden="true"
        />
        <span className="truncate">{cliente?.name ?? "—"}</span>
      </div>
      <Link
        href={`/conteudos/${content.id}`}
        className="mt-0.5 block text-sm font-medium text-gray-900 hover:text-brand-700"
      >
        {content.title}
      </Link>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <span className="text-[11px] text-gray-500">{content.format ?? "—"}</span>
      </div>
      {content.actual_post_date &&
      content.actual_post_date !== content.planned_date ? (
        <div className="mt-0.5 text-[10px] font-medium text-amber-600">
          Postado em {formatarData(content.actual_post_date)} (fora do previsto)
        </div>
      ) : null}
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <StatusContentBadge status={content.status} arte={ehArte(content.format)} />
        <PriorityBadge priority={content.priority} />
      </div>
    </div>
  );
}

function ColunaDia({
  dia,
  itens,
  clientesById,
}: {
  dia: Dia;
  itens: Content[];
  clientesById: Map<string, OpcaoCliente>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dia.iso });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[200px] w-full flex-col rounded-lg border p-2",
        isOver ? "border-brand-400 bg-brand-50" : "border-gray-200 bg-gray-50",
      )}
    >
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase text-gray-500">
          {dia.diaSemana}
        </span>
        <span
          className={cn(
            "text-sm font-bold",
            dia.hoje ? "text-brand-700" : "text-gray-800",
          )}
        >
          {dia.rotulo}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {itens.map((c) => (
          <Cartao key={c.id} content={c} cliente={clientesById.get(c.client_id)} />
        ))}
      </div>
    </div>
  );
}

/** Quadro semanal com arrastar conteúdos entre os dias. */
export function WeekBoard({ dias, contents, clientes }: WeekBoardProps) {
  const router = useRouter();
  const [itens, setItens] = useState<Content[]>(contents);
  const [pendente, iniciar] = useTransition();
  const clientesById = new Map(clientes.map((c) => [c.id, c]));

  useEffect(() => {
    if (!pendente) setItens(contents);
  }, [contents, pendente]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 6 },
    }),
    useSensor(KeyboardSensor),
  );

  function aoSoltar(evento: DragEndEvent) {
    const { active, over } = evento;
    if (!over) return;
    const novoDia = String(over.id);
    const alvo = itens.find((c) => c.id === active.id);
    if (!alvo || alvo.planned_date === novoDia) return;
    // otimista
    setItens((lista) =>
      lista.map((c) =>
        c.id === active.id ? { ...c, planned_date: novoDia } : c,
      ),
    );
    iniciar(async () => {
      const r = await alterarDataPostagemAction(String(active.id), novoDia);
      if (!r.ok) toast.erro(r.error ?? "Não foi possível mudar a data.");
      router.refresh();
    });
  }

  const porDia = (iso: string) => itens.filter((c) => c.planned_date === iso);

  return (
    <DndContext sensors={sensors} onDragEnd={aoSoltar}>
      <p className="mb-2 flex items-center gap-1.5 text-xs text-gray-500">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-gray-400" aria-hidden="true">
          <circle cx="7" cy="5" r="1.4" />
          <circle cx="13" cy="5" r="1.4" />
          <circle cx="7" cy="10" r="1.4" />
          <circle cx="13" cy="10" r="1.4" />
          <circle cx="7" cy="15" r="1.4" />
          <circle cx="13" cy="15" r="1.4" />
        </svg>
        Arraste pelo ícone para mudar a data da postagem — atualiza no sistema e
        no Google Agenda.
      </p>
      <div className="overflow-x-auto">
        <div className="grid min-w-[900px] grid-cols-7 gap-2">
          {dias.map((d) => (
            <ColunaDia
              key={d.iso}
              dia={d}
              itens={porDia(d.iso)}
              clientesById={clientesById}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
}
