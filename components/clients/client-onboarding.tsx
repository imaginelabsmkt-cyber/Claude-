"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/lib/ui/toast";
import { salvarOnboardingAction } from "@/lib/actions/client-onboarding";
import { ONBOARDING_SECOES } from "@/lib/onboarding/schema";

export function ClientOnboarding({
  clientId,
  inicial,
}: {
  clientId: string;
  inicial: Record<string, string>;
}) {
  const router = useRouter();
  const [valores, setValores] = useState<Record<string, string>>(inicial);
  const [salvando, iniciar] = useTransition();

  const sujo = useMemo(() => {
    const chaves = new Set([
      ...Object.keys(inicial),
      ...Object.keys(valores),
    ]);
    for (const k of chaves) {
      if ((inicial[k] ?? "") !== (valores[k] ?? "")) return true;
    }
    return false;
  }, [inicial, valores]);

  const setCampo = (id: string, v: string) =>
    setValores((atual) => ({ ...atual, [id]: v }));

  const salvar = () =>
    iniciar(async () => {
      const r = await salvarOnboardingAction(clientId, valores);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível salvar.");
        return;
      }
      toast.sucesso("Onboard salvo");
      router.refresh();
    });

  return (
    <div className="space-y-5">
      <p className="text-xs text-gray-500">
        O DNA do cliente: as informações principais e a direção do conteúdo,
        sempre à mão para não perder o rumo. Preencha o que fizer sentido e
        clique em salvar.
      </p>

      {ONBOARDING_SECOES.map((secao) => (
        <div
          key={secao.id}
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/60 px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <Icon nome={secao.icone} className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {secao.titulo}
              </h3>
              {secao.descricao ? (
                <p className="text-xs text-gray-500">{secao.descricao}</p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
            {secao.campos.map((campo) => (
              <div
                key={campo.id}
                className={campo.curto ? "" : "sm:col-span-2"}
              >
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  {campo.rotulo}
                </label>
                {campo.curto ? (
                  <input
                    value={valores[campo.id] ?? ""}
                    onChange={(e) => setCampo(campo.id, e.target.value)}
                    placeholder={campo.dica}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                ) : (
                  <textarea
                    value={valores[campo.id] ?? ""}
                    onChange={(e) => setCampo(campo.id, e.target.value)}
                    placeholder={campo.dica}
                    rows={3}
                    className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm leading-relaxed text-gray-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Barra de salvar (aparece quando há mudança) */}
      {sujo ? (
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-white px-4 py-3 shadow-lg">
          <span className="text-sm text-gray-600">Você tem alterações não salvas.</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setValores(inicial)}
              disabled={salvando}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Desfazer
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {salvando ? "Salvando…" : "Salvar onboard"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
