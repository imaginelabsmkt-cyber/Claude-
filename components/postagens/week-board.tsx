"use client";

import { useEffect, useState, useTransition } from "react";
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
import { StatusContentBadge, PriorityBadge } from "@/components/shared/status-badge";
import { alterarDataPostagemAction } from "@/lib/actions/contents";
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
      className="cursor-grab touch-none rounded-md border border-gray-200 bg-white p-2 shadow-sm active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-1 text-[11px] text-gray-500">
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
        onPointerDown={(e) => e.stopPropagation()}
      >
        {content.title}
      </Link>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <span className="text-[11px] text-gray-500">{content.format ?? "—"}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <StatusContentBadge status={content.status} />
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
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
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
