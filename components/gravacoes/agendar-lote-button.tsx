"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { agendarGravacoesEmLoteAction } from "@/lib/actions/contents";
import { toast } from "@/lib/ui/toast";
import { estiloFormato } from "@/lib/ui/formato";
import { formatarData } from "@/lib/utils";
import type { Content } from "@/types";
import type { OpcaoCliente } from "@/lib/data/contents";

/** Uma linha de detalhe (rótulo + valor) do roteiro, só se houver valor. */
function Detalhe({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  if (!valor) return null;
  return (
    <p className="text-xs leading-relaxed text-gray-600">
      <span className="font-semibold text-gray-500">{rotulo}: </span>
      {valor}
    </p>
  );
}

interface Props {
  clientes: OpcaoCliente[];
  /** Conteúdos ainda não agendados para gravação (candidatos). */
  candidatos: Content[];
}

/**
 * Agenda várias gravações do MESMO cliente de uma vez (mesma data/hora).
 * Cada vídeo vira um evento próprio no Google e mantém seu card/tarefa.
 */
export function AgendarLoteButton({ clientes, candidatos }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [clientId, setClientId] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [expandido, setExpandido] = useState<Set<string>>(new Set());
  const [processando, iniciar] = useTransition();

  // Só clientes que têm vídeos a agendar.
  const clientesComItens = useMemo(() => {
    const ids = new Set(candidatos.map((c) => c.client_id));
    return clientes.filter((c) => ids.has(c.id));
  }, [clientes, candidatos]);

  const doCliente = useMemo(
    () => candidatos.filter((c) => c.client_id === clientId),
    [candidatos, clientId],
  );

  function alternar(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function alternarDetalhe(id: string) {
    setExpandido((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function trocarCliente(id: string) {
    setClientId(id);
    setSelecionados(new Set()); // limpa seleção ao trocar de cliente
    setExpandido(new Set());
  }

  function agendar() {
    iniciar(async () => {
      const r = await agendarGravacoesEmLoteAction(
        [...selecionados],
        data,
        hora || null,
      );
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível agendar.");
        return;
      }
      toast.sucesso(
        `${r.quantidade ?? 0} gravação(ões) agendada(s) para o mesmo dia.`,
      );
      setAberto(false);
      setClientId("");
      setData("");
      setHora("");
      setSelecionados(new Set());
      router.refresh();
    });
  }

  const podeAgendar =
    !processando && !!clientId && !!data && selecionados.size > 0;

  return (
    <>
      <Button onClick={() => setAberto(true)}>+ Agendar gravações</Button>

      {aberto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white p-5 shadow-xl">
            <h2 className="mb-1 text-base font-semibold text-gray-900">
              Agendar gravações em lote
            </h2>
            <p className="mb-4 text-xs text-gray-500">
              Escolha o cliente, a data e a hora, e marque os vídeos que vão ser
              gravados juntos.
            </p>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">
                  Cliente
                </span>
                <select
                  value={clientId}
                  onChange={(e) => trocarCliente(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">Selecione...</option>
                  {clientesComItens.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-500">
                    Data
                  </span>
                  <input
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-500">
                    Horário (opcional)
                  </span>
                  <input
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </label>
              </div>
            </div>

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-lg border border-gray-200">
              {!clientId ? (
                <p className="p-4 text-center text-xs text-gray-400">
                  Selecione um cliente para ver os vídeos.
                </p>
              ) : doCliente.length === 0 ? (
                <p className="p-4 text-center text-xs text-gray-400">
                  Nenhum vídeo a agendar para este cliente.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {doCliente.map((c) => {
                    const est = estiloFormato(c.format);
                    const marcado = selecionados.has(c.id);
                    const aberto = expandido.has(c.id);
                    return (
                      <li key={c.id}>
                        <div className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50">
                          <label className="flex flex-1 cursor-pointer items-center gap-3 overflow-hidden">
                            <input
                              type="checkbox"
                              checked={marcado}
                              onChange={() => alternar(c.id)}
                              className="h-4 w-4 shrink-0 rounded border-gray-300"
                            />
                            <span className="flex-1 truncate text-sm text-gray-800">
                              {c.title}
                            </span>
                          </label>
                          <span
                            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                            style={{ backgroundColor: est.fundo, color: est.texto }}
                          >
                            {est.curto}
                          </span>
                          <button
                            type="button"
                            onClick={() => alternarDetalhe(c.id)}
                            aria-expanded={aberto}
                            className="shrink-0 rounded-md border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-brand-700 hover:bg-brand-50"
                          >
                            {aberto ? "ocultar" : "detalhes"}
                          </button>
                        </div>

                        {aberto ? (
                          <div className="space-y-1.5 border-t border-gray-100 bg-gray-50/60 px-3 py-2.5">
                            <Detalhe
                              rotulo="Data prevista"
                              valor={
                                c.planned_date ? formatarData(c.planned_date) : null
                              }
                            />
                            <Detalhe rotulo="Local" valor={c.recording_location} />
                            <Detalhe
                              rotulo="Participantes"
                              valor={
                                c.participants.length
                                  ? c.participants.join(", ")
                                  : null
                              }
                            />
                            <Detalhe rotulo="Roupa" valor={c.outfit} />
                            <Detalhe
                              rotulo="Materiais"
                              valor={
                                c.required_materials.length
                                  ? c.required_materials.join(", ")
                                  : null
                              }
                            />
                            {c.reference_url ? (
                              <p className="text-xs">
                                <span className="font-semibold text-gray-500">
                                  Referência:{" "}
                                </span>
                                <a
                                  href={c.reference_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-brand-700 underline"
                                >
                                  abrir link
                                </a>
                              </p>
                            ) : null}
                            {c.script ? (
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                  Roteiro
                                </p>
                                <p className="mt-0.5 max-h-40 overflow-y-auto whitespace-pre-wrap rounded border border-gray-200 bg-white p-2 text-xs leading-relaxed text-gray-700">
                                  {c.script}
                                </p>
                              </div>
                            ) : null}
                            {!c.recording_location &&
                            !c.participants.length &&
                            !c.outfit &&
                            !c.required_materials.length &&
                            !c.reference_url &&
                            !c.script &&
                            !c.planned_date ? (
                              <p className="text-xs text-gray-400">
                                Sem detalhes preenchidos para este vídeo.
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500">
                {selecionados.size} selecionado(s)
              </span>
              <div className="flex gap-2">
                <Button variante="secundaria" onClick={() => setAberto(false)}>
                  Cancelar
                </Button>
                <Button onClick={agendar} disabled={!podeAgendar}>
                  Agendar
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
