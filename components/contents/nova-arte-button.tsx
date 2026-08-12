"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { criarArteRapidaAction } from "@/lib/actions/contents";
import { toast } from "@/lib/ui/toast";
import type { OpcaoCliente } from "@/lib/data/contents";

interface Props {
  clientes: OpcaoCliente[];
  /** Mês (YYYY-MM) em que a arte será criada. */
  mes: string;
}

const FORMATOS = ["Carrossel", "Post estático"];

/** Cria uma arte/carrossel na hora, por cliente (fora do planejamento). */
export function NovaArteButton({ clientes, mes }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState(FORMATOS[0]);
  const [prazo, setPrazo] = useState("");
  const [processando, iniciar] = useTransition();

  function criar() {
    iniciar(async () => {
      const r = await criarArteRapidaAction({
        clientId,
        title,
        format,
        referenceMonth: mes,
        plannedDate: prazo || null,
      });
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível criar.");
        return;
      }
      toast.sucesso("Arte criada");
      setAberto(false);
      setClientId("");
      setTitle("");
      setPrazo("");
      router.refresh();
    });
  }

  return (
    <>
      <Button onClick={() => setAberto(true)}>+ Nova arte</Button>

      {aberto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              Nova arte / carrossel
            </h2>

            <div className="space-y-3">
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
                  Título
                </span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex.: Carrossel dicas de postura"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-500">
                    Formato
                  </span>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  >
                    {FORMATOS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-500">
                    Prazo (opcional)
                  </span>
                  <input
                    type="date"
                    value={prazo}
                    onChange={(e) => setPrazo(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </label>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variante="secundaria" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button
                onClick={criar}
                disabled={processando || !clientId || !title.trim()}
              >
                Criar arte
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
