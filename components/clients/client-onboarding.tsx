"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/lib/ui/toast";
import {
  salvarOnboardingAction,
  preencherOnboardComIAAction,
  preencherOnboardDeTextoAction,
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
  const [colarAberto, setColarAberto] = useState(false);
  const [textoColado, setTextoColado] = useState("");
  const [organizando, iniciarOrganizar] = useTransition();

  // Aplica os campos vindos da IA SEM sobrescrever o que já foi digitado.
  const aplicarCampos = (campos: Record<string, string>) => {
    setValores((atual) => {
      const novo = { ...atual };
      let mudou = 0;
      for (const [k, v] of Object.entries(campos)) {
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
  };

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
      aplicarCampos(r.campos);
    });

  const organizarTextoComIA = () =>
    iniciarOrganizar(async () => {
      const r = await preencherOnboardDeTextoAction(clientId, textoColado);
      if (!r.ok || !r.campos) {
        toast.erro(r.error ?? "Não foi possível organizar o texto.");
        return;
      }
      aplicarCampos(r.campos);
      setTextoColado("");
      setColarAberto(false);
    });

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-lg text-xs text-gray-600">
            O DNA do cliente, sempre à mão. Você não precisa digitar do zero:{" "}
            <strong>cole as respostas do cliente</strong> (ou um briefing, bio,
            áudio transcrito…) e a IA organiza nos campos. Depois é só revisar e
            salvar.
          </p>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setColarAberto((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <Icon nome="sparkles" className="h-4 w-4" />
              Colar e organizar com IA
            </button>
            <button
              type="button"
              onClick={preencherComIA}
              disabled={preenchendo}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60"
            >
              {preenchendo ? "Lendo o diagnóstico…" : "Usar o diagnóstico"}
            </button>
          </div>
        </div>

        {colarAberto ? (
          <div className="mt-3 border-t border-brand-200 pt-3">
            <textarea
              value={textoColado}
              onChange={(e) => setTextoColado(e.target.value)}
              rows={6}
              placeholder="Cole aqui as respostas do formulário do cliente, o briefing, a bio do Instagram, a transcrição de um áudio… qualquer coisa. A IA lê e preenche os campos certos."
              className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm leading-relaxed text-gray-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setColarAberto(false);
                  setTextoColado("");
                }}
                disabled={organizando}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={organizarTextoComIA}
                disabled={organizando || textoColado.trim().length < 15}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                <Icon nome="sparkles" className="h-4 w-4" />
                {organizando ? "Organizando…" : "Organizar com IA"}
              </button>
            </div>
          </div>
        ) : null}
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
