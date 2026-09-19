"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/ui/toast";
import { cn } from "@/lib/utils";
import { estiloFormato } from "@/lib/ui/formato";
import {
  criarIdeiaAction,
  arquivarIdeiaAction,
  promoverIdeiaAction,
} from "@/lib/actions/ideas";
import { FORMAT_OPTIONS, type ContentIdea } from "@/types";

/** Pilares sugeridos (texto livre — pode digitar outro). */
const PILARES = [
  "Bastidores",
  "Cases",
  "Dicas",
  "Institucional",
  "Trends",
  "Educativo",
  "Outro",
];

const CAMPO =
  "rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-60";

export function IdeasBoard({
  clientId,
  ideias,
}: {
  clientId: string;
  ideias: ContentIdea[];
}) {
  const router = useRouter();
  const [salvando, iniciar] = useTransition();

  const [titulo, setTitulo] = useState("");
  const [formato, setFormato] = useState("");
  const [pilar, setPilar] = useState("");

  const criar = () => {
    if (!titulo.trim()) {
      toast.erro("Escreva a ideia.");
      return;
    }
    iniciar(async () => {
      const r = await criarIdeiaAction({
        clientId,
        title: titulo,
        format: formato || null,
        pillar: pilar || null,
      });
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível salvar.");
        return;
      }
      toast.sucesso("Ideia salva 💡");
      setTitulo("");
      setFormato("");
      setPilar("");
      router.refresh();
    });
  };

  const produzir = (id: string) =>
    iniciar(async () => {
      const r = await promoverIdeiaAction(id);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível produzir.");
        return;
      }
      toast.sucesso("Virou conteúdo! Está na Produção. 🎬");
      router.refresh();
    });

  const arquivar = (id: string) =>
    iniciar(async () => {
      const r = await arquivarIdeiaAction(id);
      if (!r.ok) toast.erro(r.error ?? "Não foi possível arquivar.");
      else toast.sucesso("Ideia arquivada");
      router.refresh();
    });

  return (
    <div className="space-y-4">
      {/* Captura rápida */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
          Nova ideia
        </label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") criar();
          }}
          placeholder="Ex.: Bastidores de uma gravação, dica de roteiro em 30s…"
          className={cn(CAMPO, "w-full")}
        />
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <select
            aria-label="Formato"
            value={formato}
            onChange={(e) => setFormato(e.target.value)}
            className={cn(CAMPO, "w-full sm:w-40")}
          >
            <option value="">Formato…</option>
            {FORMAT_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <input
            aria-label="Pilar"
            list="pilares-favie"
            value={pilar}
            onChange={(e) => setPilar(e.target.value)}
            placeholder="Pilar (escolha ou digite)"
            className={cn(CAMPO, "w-full sm:w-48")}
          />
          <datalist id="pilares-favie">
            {PILARES.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <button
            type="button"
            onClick={criar}
            disabled={salvando}
            className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 sm:w-auto"
          >
            + Adicionar
          </button>
        </div>
      </div>

      {/* Lista de ideias */}
      {ideias.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
          Nenhuma ideia por aqui ainda. Jogue a primeira acima — quando surgir,
          é só anotar. 💡
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ideias.map((it) => {
            const est = it.format ? estiloFormato(it.format) : null;
            return (
              <div
                key={it.id}
                className="flex flex-col rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
              >
                <p className="font-medium text-gray-900">{it.title}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {est ? (
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                      style={{ backgroundColor: est.fundo, color: est.texto }}
                    >
                      {est.curto}
                    </span>
                  ) : null}
                  {it.pillar ? (
                    <span className="rounded-full bg-lilas-100 px-2 py-0.5 text-[11px] font-medium text-lilas-500">
                      {it.pillar}
                    </span>
                  ) : null}
                </div>
                {it.notes ? (
                  <p className="mt-2 text-xs text-gray-500">{it.notes}</p>
                ) : null}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => produzir(it.id)}
                    disabled={salvando}
                    className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    🎬 Produzir
                  </button>
                  <button
                    type="button"
                    onClick={() => arquivar(it.id)}
                    disabled={salvando}
                    aria-label="Arquivar ideia"
                    title="Arquivar (some da lista)"
                    className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded text-gray-300 hover:bg-gray-100 hover:text-gray-700"
                  >
                    🗄️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
