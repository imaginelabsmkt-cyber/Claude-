"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { criarConteudoRapidoAction } from "@/lib/actions/contents";
import { toast } from "@/lib/ui/toast";
import { FORMAT_OPTIONS } from "@/types";
import type { OpcaoCliente } from "@/lib/data/contents";

/**
 * Atalho "colar roteiro -> cria conteúdo". Em vez do formulário inteiro, só
 * cliente + roteiro: o sistema cria o conteúdo com padrões sensatos e, se
 * marcado, já manda pra fila de edição.
 */
export function QuickContentButton({ clientes }: { clientes: OpcaoCliente[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [clientId, setClientId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [formato, setFormato] = useState("Reel");
  const [roteiro, setRoteiro] = useState("");
  const [legenda, setLegenda] = useState("");
  const [paraFila, setParaFila] = useState(false);
  const [salvando, iniciar] = useTransition();

  function limpar() {
    setClientId("");
    setTitulo("");
    setFormato("Reel");
    setRoteiro("");
    setLegenda("");
    setParaFila(false);
  }

  function criar() {
    // Sem título? usa a 1ª linha não-vazia do roteiro.
    const tituloFinal =
      titulo.trim() ||
      roteiro
        .split(/\r?\n/)
        .map((l) => l.trim())
        .find(Boolean) ||
      "";
    iniciar(async () => {
      const r = await criarConteudoRapidoAction({
        clientId,
        title: tituloFinal,
        script: roteiro,
        caption: legenda,
        format: formato,
        paraFilaEdicao: paraFila,
      });
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível criar.");
        return;
      }
      toast.sucesso(
        paraFila ? "Conteúdo criado e na fila de edição ✓" : "Conteúdo criado ✓",
      );
      limpar();
      setAberto(false);
      router.refresh();
    });
  }

  const podeCriar =
    !salvando && !!clientId && (!!titulo.trim() || !!roteiro.trim());

  return (
    <>
      <Button variante="secundaria" onClick={() => setAberto(true)}>
        📋 Colar roteiro
      </Button>

      {aberto ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
            <h2 className="mb-1 text-base font-semibold text-gray-900">
              Criar conteúdo colando o roteiro
            </h2>
            <p className="mb-4 text-xs text-gray-500">
              Escolha o cliente e cole o roteiro. O resto o sistema preenche com
              padrões (dá pra ajustar depois no conteúdo).
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-500">
                    Cliente
                  </span>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="">Selecione...</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-500">
                    Formato
                  </span>
                  <select
                    value={formato}
                    onChange={(e) => setFormato(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  >
                    {FORMAT_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">
                  Título (opcional — se vazio, usa a 1ª linha do roteiro)
                </span>
                <input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex.: Pilates não é alongamento"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">
                  Roteiro
                </span>
                <textarea
                  value={roteiro}
                  onChange={(e) => setRoteiro(e.target.value)}
                  rows={8}
                  placeholder="Cole o roteiro aqui..."
                  className="w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm leading-relaxed outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">
                  Legenda (opcional)
                </span>
                <textarea
                  value={legenda}
                  onChange={(e) => setLegenda(e.target.value)}
                  rows={3}
                  placeholder="Cole a legenda, se já tiver..."
                  className="w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm leading-relaxed outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={paraFila}
                  onChange={(e) => setParaFila(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Já mandar pra fila de edição
              </label>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                variante="secundaria"
                onClick={() => {
                  limpar();
                  setAberto(false);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={criar} disabled={!podeCriar}>
                {salvando ? "Criando..." : "Criar conteúdo"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
