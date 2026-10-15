"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "@/lib/ui/toast";
import { definirStatusConteudoAction } from "@/lib/actions/contents";
import { atualizarDemandaAction } from "@/lib/actions/demands";
import type { ContentStatus } from "@/types";

export interface ItemLista {
  id: string;
  tipo: "demanda" | "conteudo";
  titulo: string;
  cliente: string | null;
  cor: string | null;
  meta: string | null;
  alerta: boolean;
  feito: boolean;
  /** Dá pra marcar como concluído aqui mesmo (caixinha). */
  concluivel: boolean;
  /** Conteúdo: próximo status ao concluir a etapa atual. */
  proximo: ContentStatus | null;
  /** Demanda: dá pra alterar a data de entrega aqui. */
  dataEditavel?: boolean;
  dataISO?: string | null;
  href: string;
}

export interface GrupoLista {
  rotulo: string;
  itens: ItemLista[];
  extra?: { label: string; href: string };
  /** Começa recolhido (meses distantes / concluídas). */
  inicialFechado?: boolean;
}

export interface SecaoLista {
  titulo: string;
  href?: string;
  contador?: number;
  grupos: GrupoLista[];
}

export function MinhasTarefasLista({ secoes }: { secoes: SecaoLista[] }) {
  const router = useRouter();
  const [otim, setOtim] = useState<Record<string, boolean>>({});
  const [, iniciar] = useTransition();
  const [editData, setEditData] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState("");

  // Grupos recolhidos (inicia com os marcados como inicialFechado).
  const chaveGrupo = (s: string, g: string) => `${s}|${g}`;
  const [fechados, setFechados] = useState<Set<string>>(() => {
    const set = new Set<string>();
    for (const s of secoes)
      for (const g of s.grupos)
        if (g.inicialFechado && g.itens.length > 0)
          set.add(chaveGrupo(s.titulo, g.rotulo));
    return set;
  });
  const alternarGrupo = (k: string) =>
    setFechados((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const estaFeito = (it: ItemLista) => otim[it.id] ?? it.feito;

  function concluir(it: ItemLista) {
    const novo = !estaFeito(it);
    setOtim((m) => ({ ...m, [it.id]: novo }));
    iniciar(async () => {
      let r: { ok: boolean; error?: string };
      if (it.tipo === "demanda") {
        r = await atualizarDemandaAction(it.id, {
          status: novo ? "Feita" : "A fazer",
        });
      } else if (it.proximo) {
        r = await definirStatusConteudoAction(it.id, it.proximo);
      } else {
        r = { ok: true };
      }
      if (!r.ok) {
        setOtim((m) => ({ ...m, [it.id]: !novo }));
        toast.erro(r.error ?? "Não foi possível salvar.");
        return;
      }
      router.refresh();
    });
  }

  function salvarData(it: ItemLista) {
    iniciar(async () => {
      const r = await atualizarDemandaAction(it.id, {
        due_date: rascunho || null,
      });
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível mudar a data.");
        return;
      }
      setEditData(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {secoes.map((secao) => (
        <section key={secao.titulo}>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
            {secao.titulo}
            {secao.contador != null ? (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {secao.contador}
              </span>
            ) : null}
            {secao.href ? (
              <Link
                href={secao.href}
                className="ml-auto text-xs font-medium text-brand-600 hover:underline"
              >
                ver todas →
              </Link>
            ) : null}
          </h3>

          {secao.grupos
            .filter((g) => g.itens.length > 0)
            .map((g) => {
              const chave = chaveGrupo(secao.titulo, g.rotulo);
              const fechado = fechados.has(chave);
              return (
                <div key={g.rotulo} className="mb-3">
                  <button
                    type="button"
                    onClick={() => alternarGrupo(chave)}
                    className="mb-1 flex w-full items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500 hover:text-gray-700"
                  >
                    <span aria-hidden className={fechado ? "-rotate-90" : ""}>
                      ⌄
                    </span>
                    {g.rotulo}{" "}
                    <span className="font-medium text-gray-400">
                      ({g.itens.length})
                    </span>
                  </button>

                  {!fechado ? (
                    <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white px-3 shadow-sm">
                      {g.itens.map((it) => {
                        const feito = estaFeito(it);
                        const editando = editData === it.id;
                        return (
                          <li key={it.id} className="flex items-start gap-3 py-2.5">
                            {it.concluivel ? (
                              <button
                                type="button"
                                onClick={() => concluir(it)}
                                aria-label={feito ? "Desmarcar" : "Marcar como feito"}
                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] transition-colors ${feito ? "border-green-600 bg-green-600 text-white" : "border-gray-300 bg-white hover:border-green-500"}`}
                              >
                                {feito ? "✓" : ""}
                              </button>
                            ) : (
                              <span
                                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border border-gray-200"
                                style={{ backgroundColor: it.cor ?? "#e5e7eb" }}
                                aria-hidden="true"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <Link
                                href={it.href}
                                className={`block text-sm font-medium leading-snug hover:text-brand-700 ${feito ? "text-gray-400 line-through" : "text-gray-900"}`}
                              >
                                {it.titulo}
                              </Link>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-400">
                                {it.cliente ? (
                                  <span className="flex items-center gap-1">
                                    <span
                                      className="inline-block h-2 w-2 rounded-full border border-gray-200"
                                      style={{ backgroundColor: it.cor ?? "#e5e7eb" }}
                                      aria-hidden="true"
                                    />
                                    {it.cliente}
                                  </span>
                                ) : null}
                                {it.meta ? (
                                  <span
                                    className={
                                      it.alerta ? "font-semibold text-red-600" : ""
                                    }
                                  >
                                    {it.meta}
                                  </span>
                                ) : null}
                                {it.dataEditavel && !editando ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditData(it.id);
                                      setRascunho(it.dataISO ?? "");
                                    }}
                                    className="font-medium text-brand-600 hover:underline"
                                  >
                                    {it.dataISO ? "alterar data" : "+ data"}
                                  </button>
                                ) : null}
                              </div>

                              {editando ? (
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                  <input
                                    type="date"
                                    value={rascunho}
                                    onChange={(e) => setRascunho(e.target.value)}
                                    className="rounded-md border border-gray-300 px-2 py-1 text-xs outline-none focus:border-brand-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => salvarData(it)}
                                    className="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-700"
                                  >
                                    Salvar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditData(null)}
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                  >
                                    cancelar
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                      {g.extra ? (
                        <li className="py-2 text-center">
                          <Link
                            href={g.extra.href}
                            className="text-[11px] text-brand-600 hover:underline"
                          >
                            {g.extra.label}
                          </Link>
                        </li>
                      ) : null}
                    </ul>
                  ) : null}
                </div>
              );
            })}
        </section>
      ))}
    </div>
  );
}
