"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/ui/toast";
import {
  alternarChecklistAction,
  adicionarChecklistAction,
  removerChecklistAction,
  gerarChecklistPadraoAction,
} from "@/lib/actions/checklist";
import type { ClientChecklistItem } from "@/types";
import type { ChecklistKind } from "@/lib/checklist/defaults";

export function ClientChecklist({
  clientId,
  kind,
  titulo,
  itens,
}: {
  clientId: string;
  kind: ChecklistKind;
  titulo: string;
  itens: ClientChecklistItem[];
}) {
  const router = useRouter();
  const [novo, setNovo] = useState("");
  const [processando, iniciar] = useTransition();
  // Marca otimista pra resposta imediata do checkbox.
  const [override, setOverride] = useState<Record<string, boolean>>({});

  const feito = (it: ClientChecklistItem) => override[it.id] ?? it.done;
  const total = itens.length;
  const concluidos = itens.filter(feito).length;

  const alternar = (it: ClientChecklistItem) => {
    const novoValor = !feito(it);
    setOverride((o) => ({ ...o, [it.id]: novoValor }));
    iniciar(async () => {
      const r = await alternarChecklistAction(clientId, it.id, novoValor);
      if (!r.ok) {
        setOverride((o) => ({ ...o, [it.id]: !novoValor }));
        toast.erro(r.error ?? "Erro");
      } else {
        router.refresh();
      }
    });
  };

  const adicionar = () =>
    iniciar(async () => {
      const r = await adicionarChecklistAction(clientId, kind, novo);
      if (!r.ok) {
        toast.erro(r.error ?? "Erro");
        return;
      }
      setNovo("");
      router.refresh();
    });

  const remover = (it: ClientChecklistItem) =>
    iniciar(async () => {
      const r = await removerChecklistAction(clientId, it.id);
      if (!r.ok) toast.erro(r.error ?? "Erro");
      else router.refresh();
    });

  const gerarPadrao = () =>
    iniciar(async () => {
      const r = await gerarChecklistPadraoAction(clientId, kind);
      if (!r.ok) toast.erro(r.error ?? "Erro");
      else {
        toast.sucesso("Checklist criado");
        router.refresh();
      }
    });

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-brand-800">{titulo}</h3>
        {total > 0 ? (
          <span className="text-xs font-medium text-gray-500">
            {concluidos}/{total} feitos
          </span>
        ) : null}
      </div>

      {total === 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-gray-500">Nenhum item ainda.</p>
          <button
            type="button"
            onClick={gerarPadrao}
            disabled={processando}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Gerar checklist padrão
          </button>
        </div>
      ) : (
        <ul className="space-y-1">
          {itens.map((it) => (
            <li key={it.id} className="group flex items-center gap-2">
              <button
                type="button"
                onClick={() => alternar(it)}
                className={
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] " +
                  (feito(it)
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-gray-300 bg-white text-transparent hover:border-brand-400")
                }
                aria-label={feito(it) ? "Desmarcar" : "Marcar"}
              >
                ✓
              </button>
              <span
                className={
                  "flex-1 text-sm " +
                  (feito(it)
                    ? "text-gray-400 line-through"
                    : "text-gray-800")
                }
              >
                {it.label}
              </span>
              <button
                type="button"
                onClick={() => remover(it)}
                title="Remover"
                className="text-gray-300 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {total > 0 ? (
        <div className="mt-2 flex items-center gap-2">
          <input
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && novo.trim()) adicionar();
            }}
            placeholder="Adicionar item…"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500"
          />
          <button
            type="button"
            onClick={adicionar}
            disabled={processando || !novo.trim()}
            className="rounded-lg border border-brand-300 bg-white px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
          >
            +
          </button>
        </div>
      ) : null}
    </div>
  );
}
