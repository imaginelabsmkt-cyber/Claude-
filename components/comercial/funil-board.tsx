"use client";

import { useMemo, useState, useTransition } from "react";
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
import { moverEtapaAction } from "@/lib/actions/comercial";
import {
  diasParado,
  estaParado,
  propostaVencida,
  propostaVigente,
} from "@/lib/comercial/funil";
import { toast } from "@/lib/ui/toast";
import { cn, formatarMoeda } from "@/lib/utils";
import { LEAD_STAGES_ABERTAS } from "@/types";
import type { LeadStage, LeadWithRelations } from "@/types";

interface FunilBoardProps {
  leads: LeadWithRelations[];
}

/** Card de oportunidade, arrastável entre as colunas. */
function CardLead({ lead }: { lead: LeadWithRelations }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: lead.id });

  const parado = estaParado(lead);
  const dias = diasParado(lead);
  const proposta = propostaVigente(lead.proposals);
  const vencida = proposta ? propostaVencida(proposta) : false;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
      }}
      className={cn(
        "rounded-lg border border-gray-200 border-l-4 bg-white p-2.5 shadow-sm",
        parado || vencida ? "border-l-alerta" : "border-l-area",
      )}
      {...listeners}
      {...attributes}
    >
      <Link
        href={`/interno/comercial/${lead.id}`}
        className="block text-sm font-medium text-gray-900 hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {lead.name}
      </Link>

      <p className="mt-0.5 text-base font-bold tabular-nums text-gray-900">
        {formatarMoeda(Number(lead.estimated_monthly))}
        <span className="ml-1 text-[11px] font-normal text-gray-400">/mês</span>
      </p>

      <p className="mt-1 text-[11px] text-gray-500">
        {lead.source ? `${lead.source} · ` : ""}
        {dias === 0 ? "entrou hoje" : `${dias} dia${dias > 1 ? "s" : ""} aqui`}
      </p>

      {vencida ? (
        <p className="mt-1 text-[11px] font-semibold text-alerta">
          Proposta passou da validade
        </p>
      ) : parado ? (
        <p className="mt-1 text-[11px] font-semibold text-alerta">
          Parado — hora de cutucar
        </p>
      ) : null}
    </div>
  );
}

/** Coluna de uma etapa; recebe os cards soltos. */
function Coluna({
  etapa,
  leads,
}: {
  etapa: LeadStage;
  leads: LeadWithRelations[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa });
  const total = leads.reduce((t, l) => t + Number(l.estimated_monthly), 0);

  return (
    <div className="w-60 shrink-0">
      <div className="mb-2 flex items-baseline gap-2 px-1">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
          {etapa}
        </h3>
        <span className="rounded-full bg-gray-100 px-1.5 text-[11px] text-gray-500">
          {leads.length}
        </span>
        <span className="ml-auto text-[11px] tabular-nums text-gray-400">
          {formatarMoeda(total)}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[7rem] flex-col gap-2 rounded-xl p-1.5 transition-colors",
          isOver ? "bg-area-soft" : "bg-gray-100/60",
        )}
      >
        {leads.map((l) => (
          <CardLead key={l.id} lead={l} />
        ))}
        {leads.length === 0 ? (
          <p className="px-2 py-4 text-center text-[11px] text-gray-400">
            Arraste uma oportunidade para cá
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * O quadro do funil. Arrastar muda a etapa; ganhar e perder ficam na
 * ficha da oportunidade, porque pedem mais dados (o contrato ou o motivo).
 */
export function FunilBoard({ leads }: FunilBoardProps) {
  const router = useRouter();
  const [local, setLocal] = useState(leads);
  const [, iniciar] = useTransition();
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const porEtapa = useMemo(() => {
    const mapa = new Map<LeadStage, LeadWithRelations[]>();
    for (const etapa of LEAD_STAGES_ABERTAS) mapa.set(etapa, []);
    for (const l of local) mapa.get(l.stage)?.push(l);
    return mapa;
  }, [local]);

  function aoSoltar(evento: DragEndEvent) {
    const destino = evento.over?.id as LeadStage | undefined;
    const id = String(evento.active.id);
    if (!destino) return;

    const lead = local.find((l) => l.id === id);
    if (!lead || lead.stage === destino) return;

    // Move na tela primeiro; se o servidor recusar, volta.
    const anterior = local;
    setLocal((atual) =>
      atual.map((l) =>
        l.id === id
          ? { ...l, stage: destino, stage_changed_at: new Date().toISOString() }
          : l,
      ),
    );

    iniciar(async () => {
      const r = await moverEtapaAction(id, destino);
      if (!r.ok) {
        setLocal(anterior);
        toast.erro(r.error ?? "Não foi possível mover.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <DndContext sensors={sensores} onDragEnd={aoSoltar}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {LEAD_STAGES_ABERTAS.map((etapa) => (
          <Coluna key={etapa} etapa={etapa} leads={porEtapa.get(etapa) ?? []} />
        ))}
      </div>
    </DndContext>
  );
}
