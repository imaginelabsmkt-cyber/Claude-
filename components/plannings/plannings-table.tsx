"use client";

import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { salvarPlanningAction, type PlanningPatch } from "@/lib/actions/plannings";
import { toast } from "@/lib/ui/toast";
import {
  PLANNING_STATUS_OPTIONS,
  PLANNING_TYPE_OPTIONS,
  PLANNING_ENTREGUE,
  PLANNING_SITUACAO_TONE,
} from "@/types";
import type { Planning } from "@/types";
import { cn } from "@/lib/utils";

/** Botão de ditar por voz (transcrição no navegador, pt-BR). */
function BotaoAudio({
  onTexto,
  disabled,
}: {
  onTexto: (t: string) => void;
  disabled?: boolean;
}) {
  const [gravando, setGravando] = useState(false);
  const [suportado, setSuportado] = useState(true);
  const recRef = useRef<any>(null);
  const onTextoRef = useRef(onTexto);
  useEffect(() => {
    onTextoRef.current = onTexto;
  });

  useEffect(() => {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setSuportado(false);
      return;
    }
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      let texto = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) texto += e.results[i][0].transcript;
      }
      if (texto.trim()) onTextoRef.current(texto.trim());
    };
    rec.onend = () => setGravando(false);
    rec.onerror = () => setGravando(false);
    recRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  if (!suportado) return null;

  const alternar = () => {
    const rec = recRef.current;
    if (!rec) return;
    if (gravando) {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
      setGravando(false);
    } else {
      try {
        rec.start();
        setGravando(true);
      } catch {
        setGravando(false);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={disabled}
      className={cn(
        "rounded-md border px-2.5 py-1 text-xs font-semibold",
        gravando
          ? "border-red-300 bg-red-50 text-red-700"
          : "border-gray-300 text-gray-700 hover:bg-gray-50",
      )}
    >
      {gravando ? "⏹ Parar ditado" : "🎙️ Ditar"}
    </button>
  );
}

export interface LinhaPlanejamento {
  clientId: string;
  clienteNome: string;
  cor: string | null;
  planning: Planning | null;
}

interface Props {
  mes: string;
  hojeISO: string;
  linhas: LinhaPlanejamento[];
}

const CLASSE =
  "rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm text-gray-800 outline-none hover:border-gray-300 hover:bg-white focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500";

const TOM_STATUS: Record<string, string> = {
  "Marcar reunião": "bg-gray-100 text-gray-700",
  "Reunião marcada": "bg-blue-100 text-blue-700",
  "Em criação": "bg-amber-100 text-amber-700",
  "Enviado ao cliente": "bg-purple-100 text-purple-700",
  Aprovado: "bg-green-100 text-green-700",
};

function useSalvar() {
  const router = useRouter();
  const [salvando, iniciar] = useTransition();
  const salvar = (clientId: string, mes: string, patch: PlanningPatch) =>
    iniciar(async () => {
      const r = await salvarPlanningAction(clientId, mes, patch);
      if (!r.ok) toast.erro(r.error ?? "Não foi possível salvar.");
      else toast.sucesso("Salvo");
      router.refresh();
    });
  return { salvar, salvando };
}

/** "23/09 · 11:00" (ou vazio). */
function rotuloReuniao(date: string | null, time: string | null): string {
  if (!date) return "";
  const [, m, d] = date.split("-");
  return `${d}/${m}${time ? ` · ${time}` : ""}`;
}

/**
 * Seletor de data/hora da reunião com um popover próprio (data + hora + OK
 * dentro dele), no lugar do datetime-local nativo (que não confirma nada).
 */
function CampoReuniao({
  meetingDate,
  meetingTime,
  disabled,
  onConfirmar,
  onLimpar,
}: {
  meetingDate: string | null;
  meetingTime: string | null;
  disabled?: boolean;
  onConfirmar: (date: string, time: string | null) => void;
  onLimpar: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [data, setData] = useState(meetingDate ?? "");
  const [hora, setHora] = useState(meetingTime ?? "");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  const abrir = () => {
    setData(meetingDate ?? "");
    setHora(meetingTime ?? "");
    setAberto(true);
  };

  const confirmar = () => {
    if (!data) return;
    onConfirmar(data, hora || null);
    setAberto(false);
  };

  const rotulo = rotuloReuniao(meetingDate, meetingTime);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => (aberto ? setAberto(false) : abrir())}
        className={cn(
          "flex w-[12rem] items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm",
          rotulo
            ? "border-gray-300 text-gray-800"
            : "border-dashed border-gray-300 text-gray-400",
          "hover:border-brand-400",
        )}
      >
        <span>{rotulo || "Marcar reunião"}</span>
        <span aria-hidden className="text-gray-400">
          📅
        </span>
      </button>

      {aberto ? (
        <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
          <label className="block text-[11px] font-medium text-gray-500">
            Dia
          </label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500"
          />
          <label className="mt-2 block text-[11px] font-medium text-gray-500">
            Hora
          </label>
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500"
          />
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onLimpar();
                setAberto(false);
              }}
              className="text-xs font-semibold text-gray-500 hover:text-red-600"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={confirmar}
              disabled={!data}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
            >
              OK
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Linha({
  linha,
  mes,
  hojeISO,
}: {
  linha: LinhaPlanejamento;
  mes: string;
  hojeISO: string;
}) {
  const { salvar, salvando } = useSalvar();
  const p = linha.planning;
  const status = p?.status ?? "Marcar reunião";
  const prazo = p?.delivery_deadline ?? null;
  const atrasado =
    !!prazo && prazo < hojeISO && !PLANNING_ENTREGUE.includes(status);
  // Situação AUTOMÁTICA (não é mais marcada à mão): segue o status + prazo.
  // Entregue quando enviado/aprovado; Atrasado quando passou do prazo sem
  // entregar; senão Pendente.
  const situacao = PLANNING_ENTREGUE.includes(status)
    ? "Entregue"
    : atrasado
      ? "Atrasado"
      : "Pendente";

  const [notasAbertas, setNotasAbertas] = useState(false);
  const [notas, setNotas] = useState(p?.notes ?? "");
  useEffect(() => setNotas(p?.notes ?? ""), [p?.notes]);

  const set = (patch: PlanningPatch) => salvar(linha.clientId, mes, patch);

  // Ditado por voz: acrescenta o texto transcrito e já salva.
  const adicionarDitado = (t: string) => {
    const novo = notas.trim() ? `${notas.trim()} ${t}` : t;
    setNotas(novo);
    set({ notes: novo });
  };

  return (
    <>
      <tr className="align-middle hover:bg-gray-50/60">
        <td className="px-3 py-2">
          <span className="flex items-center gap-2 font-medium text-gray-800">
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-full border border-gray-200"
              style={{ backgroundColor: linha.cor ?? "#e5e7eb" }}
              aria-hidden="true"
            />
            {linha.clienteNome}
            {salvando ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-normal text-brand-600">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />
                Salvando…
              </span>
            ) : null}
          </span>
          <select
            aria-label="Tipo do planejamento"
            value={p?.plan_type ?? "Conteúdo"}
            disabled={salvando}
            onChange={(e) => set({ plan_type: e.target.value })}
            className={cn(
              "mt-1 rounded-full px-2 py-0.5 text-[11px] font-semibold outline-none",
              (p?.plan_type ?? "Conteúdo") === "Plano de ação"
                ? "bg-brand-100 text-brand-700"
                : "bg-gray-100 text-gray-600",
            )}
          >
            {PLANNING_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2">
          <select
            aria-label="Status do planejamento"
            value={status}
            disabled={salvando}
            onChange={(e) => set({ status: e.target.value })}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold outline-none",
              TOM_STATUS[status] ?? "bg-gray-100 text-gray-700",
            )}
          >
            {PLANNING_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2">
          <CampoReuniao
            meetingDate={p?.meeting_date ?? null}
            meetingTime={p?.meeting_time ?? null}
            disabled={salvando}
            onConfirmar={(date, time) => {
              set({
                meeting_date: date,
                meeting_time: time,
                ...(status === "Marcar reunião"
                  ? { status: "Reunião marcada" }
                  : {}),
              });
              toast.sucesso("Reunião confirmada");
            }}
            onLimpar={() => set({ meeting_date: null, meeting_time: null })}
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="date"
            aria-label="Prazo de entrega"
            value={prazo ?? ""}
            disabled={salvando}
            onChange={(e) => set({ delivery_deadline: e.target.value || null })}
            className={cn(CLASSE, "w-[8.5rem]", atrasado && "text-red-600")}
          />
        </td>
        <td className="px-3 py-2">
          <span
            aria-label="Situação (automática)"
            title="Atualiza sozinha conforme o status e o prazo"
            className={cn(
              "inline-block rounded-full px-2.5 py-1 text-xs font-semibold",
              PLANNING_SITUACAO_TONE[situacao] ?? "bg-gray-100 text-gray-600",
            )}
          >
            {situacao}
          </span>
        </td>
        <td className="px-3 py-2 text-right">
          <button
            type="button"
            onClick={() => setNotasAbertas((v) => !v)}
            className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            {notasAbertas ? "Fechar" : p?.notes ? "✎ Notas" : "+ Notas"}
          </button>
        </td>
      </tr>
      {notasAbertas ? (
        <tr className="bg-gray-50/60">
          <td colSpan={6} className="px-3 py-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="block text-[11px] font-semibold uppercase text-gray-500">
                Anotações da reunião ({linha.clienteNome})
              </label>
              <BotaoAudio disabled={salvando} onTexto={adicionarDitado} />
            </div>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              onBlur={() => {
                if ((notas || "") !== (p?.notes ?? "")) set({ notes: notas });
              }}
              rows={4}
              placeholder="Ideias e ações do mês, combinados com o cliente..."
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
            <span className="mt-1 block text-[11px] text-gray-400">
              Salva sozinho ao sair do campo. O ditado por voz também salva.
            </span>
          </td>
        </tr>
      ) : null}
    </>
  );
}

/** Tabela de planejamentos do mês (um por cliente), editável na linha. */
export function PlanningsTable({ mes, hojeISO, linhas }: Props) {
  if (linhas.length === 0) {
    return (
      <EmptyState
        titulo="Nenhum cliente ativo"
        descricao="Cadastre um cliente para começar a planejar."
      />
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-3 py-2 font-semibold">Cliente</th>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className="px-3 py-2 font-semibold">Reunião</th>
            <th className="px-3 py-2 font-semibold">Prazo de entrega</th>
            <th className="px-3 py-2 font-semibold">Situação</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {linhas.map((l) => (
            <Fragment key={l.clientId}>
              <Linha linha={l} mes={mes} hojeISO={hojeISO} />
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
