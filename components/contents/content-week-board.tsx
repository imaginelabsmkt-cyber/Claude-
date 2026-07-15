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
import { alterarDataPostagemAction } from "@/lib/actions/contents";
import { estiloFormato } from "@/lib/ui/formato";
import { cn } from "@/lib/utils";

export interface ItemCalendario {
  id: string;
  title: string;
  format: string | null;
  iso: string;
}

export interface DiaSemana {
  iso: string;
  diaSemana: string; // "Seg", "Ter"...
  numero: number;
  hoje: boolean;
}

interface ContentWeekBoardProps {
  titulo: string;
  dias: DiaSemana[];
  itens: ItemCalendario[];
  hrefAnterior: string;
  hrefProximo: string;
  hrefHoje: string;
}

/** Chip legível de conteúdo (texto quebra linha, não vaza). */
function Chip({ item }: { item: ItemCalendario }) {
  const est = estiloFormato(item.format);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: item.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    backgroundColor: est.fundo,
    color: est.texto,
    borderLeftColor: est.borda,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="cursor-grab touch-none select-none rounded-md border-l-4 px-2 py-1.5 shadow-sm active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide opacity-90">
        <span aria-hidden="true">{est.icone}</span>
        {est.curto}
      </span>
      <Link
        href={`/conteudos/${item.id}`}
        onPointerDown={(e) => e.stopPropagation()}
        className="mt-0.5 block break-words text-[13px] font-semibold leading-snug hover:underline"
      >
        {item.title}
      </Link>
    </div>
  );
}

/** Coluna de um dia da semana. */
function Coluna({ dia, itens }: { dia: DiaSemana; itens: ItemCalendario[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: dia.iso });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[220px] flex-col rounded-lg border transition-colors",
        isOver ? "border-brand-400 bg-brand-50" : "border-gray-200 bg-gray-50/60",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between rounded-t-lg px-2.5 py-2",
          dia.hoje ? "bg-brand-600 text-white" : "bg-white text-gray-700",
        )}
      >
        <span className="text-xs font-semibold uppercase tracking-wide">
          {dia.diaSemana}
        </span>
        <span className="text-sm font-bold">{dia.numero}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-1.5">
        {itens.length === 0 ? (
          <span className="mt-2 text-center text-[11px] text-gray-300">—</span>
        ) : (
          itens.map((it) => <Chip key={it.id} item={it} />)
        )}
      </div>
    </div>
  );
}

/**
 * Acompanhamento SEMANAL dos conteúdos. Uma semana por vez, com colunas
 * largas e texto legível (bom para print). Arrastar um conteúdo para outro
 * dia altera a data prevista.
 */
export function ContentWeekBoard({
  titulo,
  dias,
  itens,
  hrefAnterior,
  hrefProximo,
  hrefHoje,
}: ContentWeekBoardProps) {
  const router = useRouter();
  const [lista, setLista] = useState<ItemCalendario[]>(itens);
  const [pendente, iniciar] = useTransition();

  // Não reverte um arraste otimista enquanto outro save está em voo.
  useEffect(() => {
    if (!pendente) setLista(itens);
  }, [itens, pendente]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function aoSoltar(evento: DragEndEvent) {
    const { active, over } = evento;
    if (!over) return;
    const novoDia = String(over.id);
    const alvo = lista.find((c) => c.id === active.id);
    if (!alvo || alvo.iso === novoDia) return;
    setLista((l) =>
      l.map((c) => (c.id === active.id ? { ...c, iso: novoDia } : c)),
    );
    iniciar(async () => {
      await alterarDataPostagemAction(String(active.id), novoDia);
      router.refresh();
    });
  }

  const porDia = (iso: string) => lista.filter((c) => c.iso === iso);
  const formatosNaSemana = Array.from(
    new Set(lista.map((c) => c.format ?? "Outro")),
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link
          href={hrefAnterior}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          ← Semana anterior
        </Link>
        <div className="text-center">
          <h2 className="text-base font-bold capitalize text-gray-900">
            {titulo}
          </h2>
          <Link
            href={hrefHoje}
            className="text-[11px] font-medium text-brand-700 hover:underline"
          >
            Ir para a semana atual
          </Link>
        </div>
        <Link
          href={hrefProximo}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Próxima →
        </Link>
      </div>

      <DndContext sensors={sensors} onDragEnd={aoSoltar}>
        <div className="overflow-x-auto">
          <div className="grid min-w-[860px] grid-cols-7 gap-2">
            {dias.map((d) => (
              <Coluna key={d.iso} dia={d} itens={porDia(d.iso)} />
            ))}
          </div>
        </div>
      </DndContext>

      {formatosNaSemana.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
          <span className="text-[11px] font-semibold uppercase text-gray-400">
            Legenda:
          </span>
          {formatosNaSemana.map((f) => {
            const est = estiloFormato(f);
            return (
              <span
                key={f}
                className="inline-flex items-center gap-1 rounded-full border-l-4 px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  backgroundColor: est.fundo,
                  color: est.texto,
                  borderLeftColor: est.borda,
                }}
              >
                <span aria-hidden="true">{est.icone}</span>
                {est.curto}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
