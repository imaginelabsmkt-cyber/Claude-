"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { importarDemandasAction } from "@/lib/actions/demands";
import {
  parseDemandasGrade,
  textoParaGrade,
  type ItemDemandaImport,
} from "@/lib/import/demandas-parser";
import { toast } from "@/lib/ui/toast";
import { formatarData } from "@/lib/utils";
import type { OpcaoCliente } from "@/lib/data/contents";

/**
 * Importa uma LISTA de demandas de uma vez — sobe a planilha (Excel/CSV) ou
 * cola a tabela. Dá pra escolher se são INTERNAS (FAVIE) ou de um cliente.
 */
export function ImportDemandas({ clientes }: { clientes: OpcaoCliente[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [itens, setItens] = useState<ItemDemandaImport[] | null>(null);
  const [destino, setDestino] = useState(""); // "" = interna (FAVIE)
  const [lendo, setLendo] = useState(false);
  const [salvando, iniciar] = useTransition();

  function limpar() {
    setTexto("");
    setItens(null);
    setDestino("");
  }

  async function lerArquivo(file: File) {
    setLendo(true);
    try {
      const { extrairPlanilha } = await import("@/lib/planilha/extrair");
      const grade = await extrairPlanilha(file);
      const lidos = parseDemandasGrade(grade);
      if (lidos.length === 0) {
        toast.erro("Não achei demandas na planilha. Confira o cabeçalho.");
        return;
      }
      setItens(lidos);
    } catch {
      toast.erro("Não consegui ler a planilha. Tente CSV ou colar o texto.");
    } finally {
      setLendo(false);
    }
  }

  function analisarTexto() {
    const lidos = parseDemandasGrade(textoParaGrade(texto));
    if (lidos.length === 0) {
      toast.erro(
        "Não achei demandas. Cole com cabeçalho (Demanda, Responsável, Prazo…).",
      );
      return;
    }
    setItens(lidos);
  }

  function importar() {
    if (!itens?.length) return;
    iniciar(async () => {
      const r = await importarDemandasAction(itens, destino || null);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível importar.");
        return;
      }
      toast.sucesso(`${r.criadas ?? itens.length} demanda(s) importada(s).`);
      limpar();
      setAberto(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button variante="secundaria" onClick={() => setAberto(true)}>
        ⬆ Importar lista
      </Button>

      {aberto ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
            <div className="border-b border-gray-100 p-5">
              <h2 className="text-base font-semibold text-gray-900">
                Importar lista de demandas
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Suba a planilha (Excel/CSV) ou cole a tabela. Colunas: Demanda,
                Responsável, Prazo, Mês, Área, Pronto quando, Status.
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {!itens ? (
                <div className="space-y-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-brand-300 bg-white px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">
                    {lendo ? "Lendo planilha…" : "📄 Escolher planilha (Excel/CSV)"}
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,text/csv"
                      disabled={lendo}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) lerArquivo(f);
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                  </label>
                  <p className="text-center text-xs text-gray-400">ou cole a tabela</p>
                  <textarea
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    rows={8}
                    placeholder={
                      "Demanda\tResponsável\tPrazo\tMês\tÁrea\tPronto quando\tStatus\nReunião de abertura\tAs duas\t12/10/2026\tOutubro\tGestão\tAta salva\tA fazer"
                    }
                    className="w-full resize-y rounded-md border border-gray-300 p-3 text-xs leading-relaxed outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                  <Button
                    variante="secundaria"
                    onClick={analisarTexto}
                    disabled={!texto.trim()}
                  >
                    Analisar texto
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">
                    Encontrei <strong>{itens.length}</strong> demanda(s). Revise e
                    confirme.
                  </p>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-gray-500">
                      Essas demandas são
                    </span>
                    <select
                      value={destino}
                      onChange={(e) => setDestino(e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="">Internas (da FAVIE)</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          Do cliente: {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <ul className="max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
                    {itens.map((it, i) => (
                      <li key={i} className="px-3 py-2 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {it.area ? (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600">
                              {it.area}
                            </span>
                          ) : null}
                          {it.responsavel ? (
                            <span className="rounded bg-brand-50 px-1.5 py-0.5 font-medium text-brand-700">
                              {it.responsavel}
                            </span>
                          ) : null}
                          {it.dueDate ? (
                            <span className="text-gray-400">
                              {formatarData(it.dueDate)}
                            </span>
                          ) : null}
                          <span className="text-gray-400">· {it.status}</span>
                        </div>
                        <p className="mt-0.5 text-gray-800">{it.title}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-gray-100 p-4">
              {itens ? (
                <button
                  type="button"
                  onClick={limpar}
                  className="text-xs font-semibold text-gray-500 hover:underline"
                >
                  ← escolher outra
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button
                  variante="secundaria"
                  onClick={() => {
                    limpar();
                    setAberto(false);
                  }}
                >
                  Cancelar
                </Button>
                {itens ? (
                  <Button onClick={importar} disabled={salvando}>
                    {salvando ? "Importando..." : `Importar ${itens.length}`}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
