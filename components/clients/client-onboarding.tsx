"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/lib/ui/toast";
import {
  salvarOnboardingAction,
  preencherOnboardComIAAction,
} from "@/lib/actions/client-onboarding";
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
  const [preenchendo, iniciarPreencher] = useTransition();

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

  const preencherComIA = () =>
    iniciarPreencher(async () => {
      const r = await preencherOnboardComIAAction(clientId);
      if (!r.ok || !r.campos) {
        toast.erro(r.error ?? "Não foi possível preencher com IA.");
        return;
      }
      // Só preenche o que ainda está vazio — não sobrescreve o que você digitou.
      setValores((atual) => {
        const novo = { ...atual };
        let mudou = 0;
        for (const [k, v] of Object.entries(r.campos!)) {
          if (!novo[k]?.trim() && v.trim()) {
            novo[k] = v;
            mudou += 1;
          }
        }
        toast.sucesso(
          mudou > 0
            ? `IA preencheu ${mudou} campo(s). Revise e salve.`
            : "Nada novo a preencher — já estava tudo lá.",
        );
        return novo;
      });
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50/50 p-4">
        <p className="max-w-xl text-xs text-gray-600">
          O DNA do cliente: informações principais e direção do conteúdo, sempre
          à mão. Preencha à mão, ou deixe a <strong>IA ler o diagnóstico</strong>{" "}
          e preencher pra você (é só revisar e salvar).
        </p>
        <button
          type="button"
          onClick={preencherComIA}
          disabled={preenchendo}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          <Icon nome="sparkles" className="h-4 w-4" />
          {preenchendo ? "Lendo o diagnóstico…" : "Preencher com IA"}
        </button>
      </div>

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
