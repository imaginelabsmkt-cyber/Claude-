"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/ui/toast";
import { cn } from "@/lib/utils";
import { hojeISO } from "@/lib/rules/contents";
import {
  criarDemandaAction,
  atualizarDemandaAction,
  excluirDemandaAction,
  type DemandaPatch,
} from "@/lib/actions/demands";
import {
  DEMAND_STATUS_OPTIONS,
  DEMAND_STATUS_TONE,
  DEMAND_CATEGORIES,
  type Demand,
  type DemandStatus,
  type Profile,
} from "@/types";
import type { OpcaoCliente } from "@/lib/data/contents";

const CAMPO =
  "rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-60";

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0];
}

/** Chips de responsáveis (liga/desliga; pode marcar mais de uma). */
function RespPicker({
  profiles,
  selecionados,
  onToggle,
  disabled,
}: {
  profiles: Profile[];
  selecionados: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {profiles.map((p) => {
        const on = selecionados.includes(p.id);
        return (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(p.id)}
            aria-pressed={on}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60",
              on
                ? "border-brand-500 bg-brand-600 text-white"
                : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50",
            )}
          >
            {primeiroNome(p.name)}
          </button>
        );
      })}
    </div>
  );
}

export function DemandsBoard({
  demands,
  profiles,
  clientes,
  clienteFixo,
}: {
  demands: Demand[];
  profiles: Profile[];
  clientes: OpcaoCliente[];
  /** Quando definido: mostra só as demandas deste cliente, já vincula as novas
   *  a ele e agrupa a lista por ÁREA (visão de acompanhamento do cliente). */
  clienteFixo?: string;
}) {
  const router = useRouter();
  const [salvando, iniciar] = useTransition();

  // ---- form de nova demanda ----
  const [titulo, setTitulo] = useState("");
  const [area, setArea] = useState("");
  const [resps, setResps] = useState<string[]>([]);
  const [cli, setCli] = useState("");
  const [prazo, setPrazo] = useState("");

  const nomeCli = (id: string | null) =>
    id ? (clientes.find((c) => c.id === id)?.name ?? null) : null;

  const criar = () => {
    if (!titulo.trim()) {
      toast.erro("Dê um título para a demanda.");
      return;
    }
    iniciar(async () => {
      const r = await criarDemandaAction({
        title: titulo,
        category: area || null,
        assignee_ids: resps,
        client_id: clienteFixo ?? cli ?? null,
        due_date: prazo || null,
      });
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível criar.");
        return;
      }
      toast.sucesso("Demanda criada");
      setTitulo("");
      setArea("");
      setResps([]);
      setCli("");
      setPrazo("");
      router.refresh();
    });
  };

  const salvar = (id: string, patch: DemandaPatch) =>
    iniciar(async () => {
      const r = await atualizarDemandaAction(id, patch);
      if (!r.ok) toast.erro(r.error ?? "Não foi possível salvar.");
      router.refresh();
    });

  const excluir = (id: string) =>
    iniciar(async () => {
      const r = await excluirDemandaAction(id);
      if (!r.ok) toast.erro(r.error ?? "Não foi possível excluir.");
      else toast.sucesso("Demanda excluída");
      router.refresh();
    });

  const hoje = hojeISO();

  const visiveis = clienteFixo
    ? demands.filter((d) => d.client_id === clienteFixo)
    : demands;

  // Agrupa por ÁREA só quando estamos dentro de um cliente (acompanhamento).
  const grupos = useMemo(() => {
    if (!clienteFixo) return null;
    const ordem = [...DEMAND_CATEGORIES, "Sem área"];
    const mapa = new Map<string, Demand[]>();
    for (const d of visiveis) {
      const chave = d.category?.trim() || "Sem área";
      mapa.set(chave, [...(mapa.get(chave) ?? []), d]);
    }
    return [...mapa.entries()].sort(
      (a, b) => ordem.indexOf(a[0]) - ordem.indexOf(b[0]),
    );
  }, [visiveis, clienteFixo]);

  // Ordena dentro de uma lista: não concluídas primeiro; prazo mais próximo.
  const ordenar = (lista: Demand[]) =>
    [...lista].sort((a, b) => {
      const fa = a.status === "Feita" ? 1 : 0;
      const fb = b.status === "Feita" ? 1 : 0;
      if (fa !== fb) return fa - fb;
      return (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
    });

  const Linha = ({ d, i }: { d: Demand; i: number }) => {
    const atrasada =
      d.status !== "Feita" && !!d.due_date && d.due_date < hoje;
    const feita = d.status === "Feita";
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 px-3 py-2.5",
          i > 0 && "border-t border-gray-100",
          feita && "bg-gray-50/60",
        )}
      >
        <button
          type="button"
          aria-label={feita ? "Reabrir" : "Marcar como feita"}
          title={feita ? "Reabrir" : "Marcar como feita"}
          disabled={salvando}
          onClick={() => salvar(d.id, { status: feita ? "A fazer" : "Feita" })}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-white transition-colors",
            feita
              ? "border-green-600 bg-green-600"
              : "border-gray-300 hover:border-green-500",
          )}
        >
          {feita ? "✓" : ""}
        </button>

        <input
          key={`${d.id}-${d.title}`}
          defaultValue={d.title}
          disabled={salvando}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v && v !== d.title) salvar(d.id, { title: v });
          }}
          className={cn(
            "min-w-[160px] flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-gray-300 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500",
            feita ? "text-gray-400 line-through" : "text-gray-900",
          )}
        />

        {/* Área só aparece por linha na visão geral (no cliente vira grupo). */}
        {!clienteFixo ? (
          <select
            aria-label="Área"
            value={d.category ?? ""}
            disabled={salvando}
            onChange={(e) => salvar(d.id, { category: e.target.value || null })}
            className="rounded-md border border-transparent bg-transparent px-1 py-1 text-xs text-gray-600 hover:border-gray-300 focus:border-brand-500 focus:bg-white focus:outline-none"
          >
            <option value="">Sem área</option>
            {DEMAND_CATEGORIES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        ) : null}

        <RespPicker
          profiles={profiles}
          selecionados={d.assignee_ids ?? []}
          disabled={salvando}
          onToggle={(id) => {
            const atual = d.assignee_ids ?? [];
            const novo = atual.includes(id)
              ? atual.filter((x) => x !== id)
              : [...atual, id];
            salvar(d.id, { assignee_ids: novo });
          }}
        />

        {!clienteFixo && d.client_id ? (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
            {nomeCli(d.client_id) ?? "Cliente"}
          </span>
        ) : null}

        <input
          type="date"
          aria-label="Prazo"
          value={d.due_date ?? ""}
          disabled={salvando}
          onChange={(e) => salvar(d.id, { due_date: e.target.value || null })}
          className={cn(
            "rounded-md border border-transparent bg-transparent px-1.5 py-1 text-xs hover:border-gray-300 focus:border-brand-500 focus:bg-white focus:outline-none",
            atrasada ? "font-semibold text-red-600" : "text-gray-600",
          )}
        />

        <select
          aria-label="Status"
          value={d.status}
          disabled={salvando}
          onChange={(e) =>
            salvar(d.id, { status: e.target.value as DemandStatus })
          }
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold outline-none",
            DEMAND_STATUS_TONE[d.status],
          )}
        >
          {DEMAND_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <button
          type="button"
          aria-label="Excluir demanda"
          title="Excluir"
          disabled={salvando}
          onClick={() => excluir(d.id)}
          className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-600"
        >
          🗑
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Nova demanda */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
              Nova demanda
            </label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") criar();
              }}
              placeholder={
                clienteFixo
                  ? "Ex.: Otimizar Google Meu Negócio, subir relatório…"
                  : "Ex.: Renovar contrato, responder cliente…"
              }
              className={cn(CAMPO, "w-full")}
            />
          </div>
          <select
            aria-label="Área"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className={CAMPO}
          >
            <option value="">Área…</option>
            {DEMAND_CATEGORIES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Resp.:</span>
            <RespPicker
              profiles={profiles}
              selecionados={resps}
              disabled={salvando}
              onToggle={(id) =>
                setResps((atual) =>
                  atual.includes(id)
                    ? atual.filter((x) => x !== id)
                    : [...atual, id],
                )
              }
            />
          </div>
          {!clienteFixo ? (
            <select
              aria-label="Cliente (opcional)"
              value={cli}
              onChange={(e) => setCli(e.target.value)}
              className={CAMPO}
            >
              <option value="">Sem cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : null}
          <input
            type="date"
            aria-label="Prazo"
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
            className={CAMPO}
          />
          <button
            type="button"
            onClick={criar}
            disabled={salvando}
            className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Adicionar
          </button>
        </div>
      </div>

      {/* Lista */}
      {visiveis.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
          Nenhuma demanda por aqui. Crie a primeira acima. 👆
        </p>
      ) : grupos ? (
        // Visão do cliente: agrupada por ÁREA.
        <div className="space-y-4">
          {grupos.map(([area, itens]) => (
            <div key={area}>
              <h3 className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {area}
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                  {itens.length}
                </span>
              </h3>
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {ordenar(itens).map((d, i) => (
                  <Linha key={d.id} d={d} i={i} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Visão geral: lista única.
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {visiveis.map((d, i) => (
            <Linha key={d.id} d={d} i={i} />
          ))}
        </div>
      )}
    </div>
  );
}
