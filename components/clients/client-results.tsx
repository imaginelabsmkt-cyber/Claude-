"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/ui/toast";
import { Icon } from "@/components/ui/icon";
import {
  salvarResultadosEquipeAction,
  salvarPlanilhaTrafegoAction,
} from "@/lib/actions/resultados";
import {
  extrairPlanilha,
  extrairKPIs,
  explicarKPIs,
} from "@/lib/planilha/extrair";
import type { ClientMonthlyResult, MetricaTrafego } from "@/types";

/** Sugestões de métricas de tráfego pago/anúncios (a equipe pode trocar). */
const SUGESTOES = [
  "Investimento",
  "Pessoas alcançadas",
  "Impressões",
  "Visitas à página",
  "Conversas iniciadas",
];

function fmtQuando(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(iso));
}

export function ClientResults({
  clientId,
  weekStart,
  intervalo,
  inicial,
}: {
  clientId: string;
  weekStart: string; // segunda-feira (YYYY-MM-DD)
  intervalo: string; // "22/set a 28/set"
  inicial: ClientMonthlyResult | null;
}) {
  const router = useRouter();
  const [metrics, setMetrics] = useState<MetricaTrafego[]>(
    inicial?.metrics?.length
      ? inicial.metrics
      : SUGESTOES.map((label) => ({ label, value: "" })),
  );
  const [note, setNote] = useState(inicial?.team_note ?? "");
  const [salvando, iniciar] = useTransition();
  const [manualAberto, setManualAberto] = useState(false);
  const respCliente = inicial;

  const inputPlanilha = useRef<HTMLInputElement>(null);
  const [tabela, setTabela] = useState<string[][] | null>(
    inicial?.traffic_table ?? null,
  );
  const [nomePlanilha, setNomePlanilha] = useState<string | null>(
    inicial?.traffic_file_name ?? null,
  );
  const [lendo, setLendo] = useState(false);

  // Só mostra no dashboard as métricas com valor preenchido.
  const preenchidas = metrics.filter((m) => m.value.trim());

  const subirPlanilha = async (file: File) => {
    setLendo(true);
    try {
      const grade = await extrairPlanilha(file);
      if (grade.length === 0) {
        toast.erro("Não consegui ler a planilha. Tente salvar como CSV.");
        setLendo(false);
        return;
      }
      const r = await salvarPlanilhaTrafegoAction(
        clientId,
        weekStart,
        grade,
        file.name,
      );
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível salvar.");
        setLendo(false);
        return;
      }
      const kpis = extrairKPIs(grade);
      if (kpis.length > 0) {
        const explic = note.trim() ? note : explicarKPIs(kpis);
        await salvarResultadosEquipeAction(clientId, weekStart, kpis, explic);
        setMetrics(kpis);
        if (!note.trim() && explic) setNote(explic);
      }
      setTabela(grade);
      setNomePlanilha(file.name);
      toast.sucesso(
        kpis.length > 0
          ? `Planilha importada. ${kpis.length} indicadores reconhecidos.`
          : "Planilha importada.",
      );
      router.refresh();
    } catch {
      toast.erro("Não consegui ler esse arquivo.");
    }
    setLendo(false);
  };

  const removerPlanilha = async () => {
    if (!window.confirm("Remover a planilha importada desta semana?")) return;
    const r = await salvarPlanilhaTrafegoAction(clientId, weekStart, null, null);
    if (!r.ok) {
      toast.erro(r.error ?? "Não foi possível remover.");
      return;
    }
    setTabela(null);
    setNomePlanilha(null);
    toast.sucesso("Planilha removida");
    router.refresh();
  };

  const setMetric = (i: number, campo: keyof MetricaTrafego, v: string) =>
    setMetrics((arr) =>
      arr.map((m, idx) => (idx === i ? { ...m, [campo]: v } : m)),
    );
  const addMetric = () =>
    setMetrics((arr) => [...arr, { label: "", value: "" }]);
  const removeMetric = (i: number) =>
    setMetrics((arr) => arr.filter((_, idx) => idx !== i));

  const salvar = () =>
    iniciar(async () => {
      const r = await salvarResultadosEquipeAction(
        clientId,
        weekStart,
        metrics,
        note,
      );
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível salvar.");
        return;
      }
      toast.sucesso("Resultados salvos");
      router.refresh();
    });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900">
            Tráfego pago (anúncios)
          </h3>
          <span className="text-xs font-medium text-gray-500">
            Semana de {intervalo} · use as setas da semana acima para trocar
          </span>
        </div>
        <p className="mt-0.5 text-xs text-gray-500">
          Suba a planilha do Meta (Excel ou CSV) e o sistema extrai os números,
          ou preencha na mão. É isso que o cliente vê no painel dele.
        </p>

        {/* Subir planilha */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => inputPlanilha.current?.click()}
            disabled={lendo}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            <Icon nome="upload" className="h-3.5 w-3.5" />
            {lendo
              ? "Lendo…"
              : tabela
                ? "Trocar planilha"
                : "Subir planilha (Excel/CSV)"}
          </button>
          {nomePlanilha ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700">
              <Icon nome="file" className="h-3.5 w-3.5 text-gray-400" />
              {nomePlanilha}
              <button
                type="button"
                onClick={removerPlanilha}
                title="Remover"
                className="ml-1 text-gray-400 hover:text-red-600"
              >
                ✕
              </button>
            </span>
          ) : null}
          <input
            ref={inputPlanilha}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) subirPlanilha(f);
              e.target.value = "";
            }}
          />
        </div>

        {/* Dashboard (preview igual ao do cliente) */}
        {preenchidas.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {preenchidas.map((m, i) => (
              <div
                key={i}
                className="rounded-xl bg-gradient-to-br from-brand-50 to-white p-3 text-center ring-1 ring-brand-100"
              >
                <p className="text-lg font-extrabold leading-tight text-brand-800">
                  {m.value}
                </p>
                <p className="mt-0.5 text-[10px] font-medium uppercase leading-tight tracking-wide text-gray-500">
                  {m.label}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {/* Editar números na mão (recolhível) */}
        <button
          type="button"
          onClick={() => setManualAberto((v) => !v)}
          className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-600"
        >
          {manualAberto ? "▲ Ocultar edição" : "▼ Editar números na mão"}
        </button>
        {manualAberto ? (
          <div className="mt-2 space-y-2">
            {metrics.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={m.label}
                  onChange={(e) => setMetric(i, "label", e.target.value)}
                  placeholder="Ex.: Investimento"
                  className="w-1/2 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
                <input
                  value={m.value}
                  onChange={(e) => setMetric(i, "value", e.target.value)}
                  placeholder="valor"
                  className="w-1/2 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
                <button
                  type="button"
                  onClick={() => removeMetric(i)}
                  title="Remover"
                  className="rounded-md px-2 py-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addMetric}
              className="text-xs font-semibold text-brand-700 hover:underline"
            >
              + Adicionar número
            </button>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <label className="block text-xs font-medium text-gray-600">
            Explicação dos números (o cliente lê)
          </label>
          <button
            type="button"
            onClick={() => {
              const t = explicarKPIs(metrics);
              if (!t) {
                toast.erro("Preencha os números primeiro.");
                return;
              }
              setNote(t);
            }}
            className="text-xs font-semibold text-brand-700 hover:underline"
          >
            ✨ Gerar explicação automática
          </button>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="Ex.: Nesta semana investimos R$ 175,70 e alcançamos 12 mil pessoas…"
          className="mt-1 w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm leading-relaxed outline-none focus:border-brand-500"
        />

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {salvando ? "Salvando…" : "Salvar resultados"}
          </button>
        </div>
      </div>

      {/* Resposta do cliente (só leitura) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">
          Retorno do cliente
        </h3>
        {respCliente?.client_updated_at ? (
          <div className="mt-2 space-y-2 text-sm text-gray-700">
            <p>
              <span className="font-semibold">Fechou na semana:</span>{" "}
              {respCliente.closed_count ?? "não informado"}
            </p>
            {respCliente.sources ? (
              <p>
                <span className="font-semibold">De onde vieram:</span>{" "}
                {respCliente.sources}
              </p>
            ) : null}
            {respCliente.client_comment ? (
              <p className="whitespace-pre-wrap">
                <span className="font-semibold">Comentário:</span>{" "}
                {respCliente.client_comment}
              </p>
            ) : null}
            <p className="text-xs text-gray-400">
              Respondido em {fmtQuando(respCliente.client_updated_at)}
            </p>
          </div>
        ) : (
          <p className="mt-1 text-xs text-gray-400">
            O cliente ainda não respondeu os resultados desta semana pelo painel.
          </p>
        )}
      </div>
    </div>
  );
}
