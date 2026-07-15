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

export interface CelulaDia {
  iso: string;
  dia: number;
  noMes: boolean;
  hoje: boolean;
}

interface ContentMonthCalendarProps {
  titulo: string;
  dias: CelulaDia[][];
  itens: ItemCalendario[];
  hrefAnterior: string;
  hrefProximo: string;
  /** Habilita arrastar conteúdos entre os dias (padrão: true). */
  arrastavel?: boolean;
}

const NOMES_DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/** Chip visual de um conteúdo dentro do dia. */
function Chip({
  item,
  arrastavel,
}: {
  item: ItemCalendario;
  arrastavel: boolean;
}) {
  const est = estiloFormato(item.format);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: item.id, disabled: !arrastavel });
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
      className={cn(
        "select-none rounded-md border-l-4 px-1.5 py-1 shadow-sm",
        arrastavel ? "cursor-grab touch-none active:cursor-grabbing" : "",
      )}
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
        className="mt-0.5 block text-[12px] font-semibold leading-snug hover:underline"
      >
        {item.title}
      </Link>
    </div>
  );
}

/** Uma célula-dia que recebe conteúdos soltos sobre ela. */
function Celula({
  dia,
  itens,
  arrastavel,
}: {
  dia: CelulaDia;
  itens: ItemCalendario[];
  arrastavel: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: dia.iso,
    disabled: !arrastavel,
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[120px] flex-col gap-1 rounded-lg border p-1.5 transition-colors",
        dia.noMes ? "bg-white" : "bg-gray-50/70",
        isOver
          ? "border-brand-400 ring-2 ring-brand-200"
          : dia.hoje
            ? "border-brand-400"
            : "border-gray-200",
      )}
    >
      <span
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
          dia.hoje
            ? "bg-brand-600 text-white"
            : dia.noMes
              ? "text-gray-700"
              : "text-gray-400",
        )}
      >
        {dia.dia}
      </span>
      <div className="flex flex-col gap-1">
        {itens.map((it) => (
          <Chip key={it.id} item={it} arrastavel={arrastavel} />
        ))}
      </div>
    </div>
  );
}

/**
 * Calendário mensal visual dos conteúdos. Cada conteúdo aparece no dia em que
 * sai, com cor e ícone por formato — legível inclusive num print para o cliente.
 * Permite arrastar um conteúdo para outro dia (altera a data prevista).
 */
export function ContentMonthCalendar({
  titulo,
  dias,
  itens,
  hrefAnterior,
  hrefProximo,
  arrastavel = true,
}: ContentMonthCalendarProps) {
  const router = useRouter();
  const [lista, setLista] = useState<ItemCalendario[]>(itens);
  const [, iniciar] = useTransition();

  useEffect(() => setLista(itens), [itens]);

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

  // Legenda de formatos presente no mês.
  const formatosNoMes = Array.from(
    new Set(lista.map((c) => c.format ?? "Outro")),
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link
          href={hrefAnterior}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          ← Anterior
        </Link>
        <h2 className="text-lg font-bold capitalize text-gray-900">{titulo}</h2>
        <Link
          href={hrefProximo}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Próximo →
        </Link>
      </div>

      {arrastavel ? (
        <p className="mb-3 text-center text-[11px] text-gray-400">
          Dica: arraste um conteúdo para outro dia para mudar a data.
        </p>
      ) : null}

      <DndContext sensors={sensors} onDragEnd={aoSoltar}>
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
              {NOMES_DIAS.map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="mt-1.5 space-y-1.5">
              {dias.map((semana, i) => (
                <div key={i} className="grid grid-cols-7 gap-1.5">
                  {semana.map((d) => (
                    <Celula
                      key={d.iso}
                      dia={d}
                      itens={porDia(d.iso)}
                      arrastavel={arrastavel}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DndContext>

      {formatosNoMes.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
          <span className="text-[11px] font-semibold uppercase text-gray-400">
            Legenda:
          </span>
          {formatosNoMes.map((f) => {
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
