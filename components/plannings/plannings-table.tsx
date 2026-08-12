"use client";

import { Fragment, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { salvarPlanningAction, type PlanningPatch } from "@/lib/actions/plannings";
import { toast } from "@/lib/ui/toast";
import { PLANNING_STATUS_OPTIONS, PLANNING_ENTREGUE } from "@/types";
import type { Planning } from "@/types";
import { cn } from "@/lib/utils";

export interface LinhaPlanejamento {
  clientId: string;
  clienteNome: string;
  cor: string | null;
  planning: Planning | null;
}

interface Props {
  mes: string;
  hojeISO: string;
  linhas: LinhaPlanejamento[];
}

const CLASSE =
  "rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm text-gray-800 outline-none hover:border-gray-300 hover:bg-white focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500";

const TOM_STATUS: Record<string, string> = {
  "Marcar reunião": "bg-gray-100 text-gray-700",
  "Reunião marcada": "bg-blue-100 text-blue-700",
  "Em criação": "bg-amber-100 text-amber-700",
  "Enviado ao cliente": "bg-purple-100 text-purple-700",
  Aprovado: "bg-green-100 text-green-700",
};

function useSalvar() {
  const router = useRouter();
  const [salvando, iniciar] = useTransition();
  const salvar = (clientId: string, mes: string, patch: PlanningPatch) =>
    iniciar(async () => {
      const r = await salvarPlanningAction(clientId, mes, patch);
      if (!r.ok) toast.erro(r.error ?? "Não foi possível salvar.");
      else toast.sucesso("Salvo");
      router.refresh();
    });
  return { salvar, salvando };
}

function Linha({
  linha,
  mes,
  hojeISO,
}: {
  linha: LinhaPlanejamento;
  mes: string;
  hojeISO: string;
}) {
  const { salvar, salvando } = useSalvar();
  const p = linha.planning;
  const status = p?.status ?? "Marcar reunião";
  const prazo = p?.delivery_deadline ?? null;
  const atrasado =
    !!prazo && prazo < hojeISO && !PLANNING_ENTREGUE.includes(status);

  const [notasAbertas, setNotasAbertas] = useState(false);
  const [notas, setNotas] = useState(p?.notes ?? "");
  useEffect(() => setNotas(p?.notes ?? ""), [p?.notes]);

  const set = (patch: PlanningPatch) => salvar(linha.clientId, mes, patch);

  return (
    <>
      <tr className="align-middle hover:bg-gray-50/60">
        <td className="px-3 py-2">
          <span className="flex items-center gap-2 font-medium text-gray-800">
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-full border border-gray-200"
              style={{ backgroundColor: linha.cor ?? "#e5e7eb" }}
              aria-hidden="true"
            />
            {linha.clienteNome}
          </span>
        </td>
        <td className="px-3 py-2">
          <select
            aria-label="Status do planejamento"
            value={status}
            disabled={salvando}
            onChange={(e) => set({ status: e.target.value })}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold outline-none",
              TOM_STATUS[status] ?? "bg-gray-100 text-gray-700",
            )}
          >
            {PLANNING_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2">
          <input
            type="datetime-local"
            aria-label="Data e hora da reunião"
            value={
              p?.meeting_date
                ? `${p.meeting_date}T${p.meeting_time ?? "00:00"}`
                : ""
            }
            disabled={salvando}
            onChange={(e) => {
              const v = e.target.value; // "YYYY-MM-DDTHH:MM" ou ""
              if (!v) set({ meeting_date: null, meeting_time: null });
              else
                set({
                  meeting_date: v.slice(0, 10),
                  meeting_time: v.slice(11, 16),
                });
            }}
            className={cn(CLASSE, "w-[12.5rem]")}
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="date"
            aria-label="Prazo de entrega"
            value={prazo ?? ""}
            disabled={salvando}
            onChange={(e) => set({ delivery_deadline: e.target.value || null })}
            className={cn(CLASSE, "w-[8.5rem]", atrasado && "text-red-600")}
          />
        </td>
        <td className="px-3 py-2">
          {atrasado ? (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
              Atrasado
            </span>
          ) : (
            <span className="text-[11px] text-gray-400">Em dia</span>
          )}
        </td>
        <td className="px-3 py-2 text-right">
          <button
            type="button"
            onClick={() => setNotasAbertas((v) => !v)}
            className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            {notasAbertas ? "Fechar" : p?.notes ? "✎ Notas" : "+ Notas"}
          </button>
        </td>
      </tr>
      {notasAbertas ? (
        <tr className="bg-gray-50/60">
          <td colSpan={6} className="px-3 py-3">
            <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500">
              Anotações da reunião ({linha.clienteNome})
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              onBlur={() => {
                if ((notas || "") !== (p?.notes ?? "")) set({ notes: notas });
              }}
              rows={4}
              placeholder="Ideias e ações do mês, combinados com o cliente..."
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
            <span className="mt-1 block text-[11px] text-gray-400">
              Salva sozinho ao sair do campo.
            </span>
          </td>
        </tr>
      ) : null}
    </>
  );
}

/** Tabela de planejamentos do mês (um por cliente), editável na linha. */
export function PlanningsTable({ mes, hojeISO, linhas }: Props) {
  if (linhas.length === 0) {
    return (
      <EmptyState
        titulo="Nenhum cliente ativo"
        descricao="Cadastre um cliente para começar a planejar."
      />
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-3 py-2 font-semibold">Cliente</th>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className="px-3 py-2 font-semibold">Reunião</th>
            <th className="px-3 py-2 font-semibold">Prazo de entrega</th>
            <th className="px-3 py-2 font-semibold">Situação</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {linhas.map((l) => (
            <Fragment key={l.clientId}>
              <Linha linha={l} mes={mes} hojeISO={hojeISO} />
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
