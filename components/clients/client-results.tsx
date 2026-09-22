"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/ui/toast";
import { Icon } from "@/components/ui/icon";
import {
  salvarResultadosEquipeAction,
  salvarPlanilhaTrafegoAction,
} from "@/lib/actions/resultados";
import { extrairPlanilha } from "@/lib/planilha/extrair";
import type { ClientMonthlyResult, MetricaTrafego } from "@/types";

const NOMES_MES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function rotuloMes(m: string): string {
  const [a, mm] = m.split("-").map(Number);
  return `${NOMES_MES[(mm ?? 1) - 1] ?? ""} de ${a}`;
}
function mesDelta(m: string, d: number): string {
  const [a, mm] = m.split("-").map(Number);
  const dt = new Date(a, mm - 1 + d, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}
function fmtQuando(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(iso));
}

/** Sugestões de métricas de tráfego pago/anúncios (a equipe pode trocar). */
const SUGESTOES = [
  "Investimento",
  "Pessoas alcançadas",
  "Impressões",
  "Visitas à página",
  "Conversas iniciadas",
  "Viraram consulta/agendamento",
];

export function ClientResults({
  clientId,
  mesAtual,
  inicial,
}: {
  clientId: string;
  mesAtual: string;
  inicial: ClientMonthlyResult | null;
}) {
  const router = useRouter();
  const [mes, setMes] = useState(mesAtual);
  const [metrics, setMetrics] = useState<MetricaTrafego[]>(
    inicial?.metrics?.length
      ? inicial.metrics
      : SUGESTOES.map((label) => ({ label, value: "" })),
  );
  const [note, setNote] = useState(inicial?.team_note ?? "");
  const [salvando, iniciar] = useTransition();
  const respCliente = inicial;

  const inputPlanilha = useRef<HTMLInputElement>(null);
  const [tabela, setTabela] = useState<string[][] | null>(
    inicial?.traffic_table ?? null,
  );
  const [nomePlanilha, setNomePlanilha] = useState<string | null>(
    inicial?.traffic_file_name ?? null,
  );
  const [lendo, setLendo] = useState(false);

  const subirPlanilha = async (file: File) => {
    setLendo(true);
    try {
      const grade = await extrairPlanilha(file);
      if (grade.length === 0) {
        toast.erro("Não consegui ler a planilha. Tente salvar como CSV.");
        setLendo(false);
        return;
      }
      const r = await salvarPlanilhaTrafegoAction(clientId, mes, grade, file.name);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível salvar.");
        setLendo(false);
        return;
      }
      setTabela(grade);
      setNomePlanilha(file.name);
      toast.sucesso("Planilha importada");
      router.refresh();
    } catch {
      toast.erro("Não consegui ler esse arquivo.");
    }
    setLendo(false);
  };

  const removerPlanilha = async () => {
    if (!window.confirm("Remover a planilha importada deste mês?")) return;
    const r = await salvarPlanilhaTrafegoAction(clientId, mes, null, null);
    if (!r.ok) {
      toast.erro(r.error ?? "Não foi possível remover.");
      return;
    }
    setTabela(null);
    setNomePlanilha(null);
    toast.sucesso("Planilha removida");
    router.refresh();
  };

  // Quando muda o mês, recarrega a página com o mês novo (dados via servidor).
  const trocarMes = (novo: string) => {
    setMes(novo);
    router.push(`/clientes/${clientId}?resultadosMes=${novo}#resultados`);
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
      const r = await salvarResultadosEquipeAction(clientId, mes, metrics, note);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível salvar.");
        return;
      }
      toast.sucesso("Resultados salvos");
      router.refresh();
    });

  return (
    <div id="resultados" className="space-y-4">
      {/* Navegação de mês */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => trocarMes(mesDelta(mes, -1))}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          ←
        </button>
        <span className="text-sm font-bold capitalize text-gray-900">
          {rotuloMes(mes)}
        </span>
        <button
          type="button"
          onClick={() => trocarMes(mesDelta(mes, 1))}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          →
        </button>
      </div>

      {/* Números do tráfego (equipe) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">
          Tráfego pago (anúncios)
        </h3>
        <p className="mt-0.5 text-xs text-gray-500">
          Suba a planilha do Meta (Excel ou CSV) e o sistema extrai os números,
          ou preencha na mão. É isso que o cliente vê no painel dele.
        </p>

        {/* Subir planilha (extrai sozinho) */}
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

        {tabela && tabela.length > 0 ? (
          <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full border-collapse text-left text-xs">
              <tbody>
                {tabela.map((linha, i) => (
                  <tr
                    key={i}
                    className={
                      i === 0
                        ? "bg-brand-50 font-semibold text-brand-800"
                        : "border-t border-gray-100"
                    }
                  >
                    {linha.map((cel, j) => (
                      <td
                        key={j}
                        className="whitespace-nowrap px-2 py-1 text-gray-700"
                      >
                        {cel}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Ou preencha na mão
        </p>
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
        </div>
        <button
          type="button"
          onClick={addMetric}
          className="mt-2 text-xs font-semibold text-brand-700 hover:underline"
        >
          + Adicionar número
        </button>

        <label className="mt-4 block text-xs font-medium text-gray-600">
          Explicação dos números (o cliente lê)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="Ex.: Esse mês investimos R$ 450 e alcançamos 12 mil pessoas. Geramos 18 contatos no direct. O custo por contato caiu em relação ao mês passado…"
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
              <span className="font-semibold">Fechou no mês:</span>{" "}
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
            O cliente ainda não respondeu os resultados deste mês pelo painel.
          </p>
        )}
      </div>
    </div>
  );
}
