"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/ui/toast";
import { Icon } from "@/components/ui/icon";
import { formatarData } from "@/lib/utils";
import {
  salvarEstrategiaAction,
  statusEstrategiaAction,
  excluirEstrategiaAction,
  type DadosEstrategia,
} from "@/lib/actions/action-plan";
import {
  ACTION_PLAN_TYPES,
  DEMAND_STATUS_OPTIONS,
  DEMAND_STATUS_TONE,
  type ActionPlanItem,
  type Profile,
} from "@/types";

const BUCKET = "client-files";
const LIMITE_MB = 25;

function nomeSeguro(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-80);
}

const VAZIO: DadosEstrategia = {
  title: "",
  type: "Ranqueamento Google",
  status: "A fazer",
  description: "",
  due_date: "",
  assignee_id: "",
  file_path: null,
  file_name: null,
};

export function ClientActionPlan({
  clientId,
  itens,
  perfis,
}: {
  clientId: string;
  itens: ActionPlanItem[];
  perfis: Profile[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<DadosEstrategia | null>(null);
  const [salvando, iniciar] = useTransition();
  const [enviandoArq, setEnviandoArq] = useState(false);

  const nomePerfil = (id: string | null) =>
    id ? (perfis.find((p) => p.id === id)?.name ?? null) : null;

  const abrirNovo = () => setForm({ ...VAZIO });
  const abrirEdicao = (it: ActionPlanItem) =>
    setForm({
      id: it.id,
      title: it.title,
      type: it.type ?? "Outro",
      status: it.status,
      description: it.description ?? "",
      due_date: it.due_date ?? "",
      assignee_id: it.assignee_id ?? "",
      file_path: it.file_path,
      file_name: it.file_name,
    });

  const set = (campo: keyof DadosEstrategia, v: string | null) =>
    setForm((f) => (f ? { ...f, [campo]: v } : f));

  const enviarArquivo = async (file: File) => {
    if (file.size > LIMITE_MB * 1024 * 1024) {
      toast.erro(`O arquivo passa de ${LIMITE_MB} MB.`);
      return;
    }
    setEnviandoArq(true);
    const path = `${clientId}/plano-acao/${crypto.randomUUID()}-${nomeSeguro(file.name)}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type || undefined });
    setEnviandoArq(false);
    if (error) {
      toast.erro(
        /bucket|not found/i.test(error.message)
          ? "Armazenamento ainda não ativado (migração client_files)."
          : "Não foi possível enviar o arquivo.",
      );
      return;
    }
    setForm((f) => (f ? { ...f, file_path: path, file_name: file.name } : f));
    toast.sucesso("Arquivo anexado");
  };

  const salvar = () =>
    iniciar(async () => {
      if (!form) return;
      const r = await salvarEstrategiaAction(clientId, form);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível salvar.");
        return;
      }
      toast.sucesso("Estratégia salva");
      setForm(null);
      router.refresh();
    });

  const mudarStatus = (id: string, status: string) =>
    iniciar(async () => {
      const r = await statusEstrategiaAction(clientId, id, status);
      if (!r.ok) toast.erro(r.error ?? "Erro");
      else router.refresh();
    });

  const excluir = (it: ActionPlanItem) =>
    iniciar(async () => {
      if (!window.confirm(`Remover "${it.title}"?`)) return;
      const r = await excluirEstrategiaAction(clientId, it.id);
      if (!r.ok) toast.erro(r.error ?? "Erro");
      else {
        toast.sucesso("Estratégia removida");
        router.refresh();
      }
    });

  const baixar = async (it: ActionPlanItem) => {
    if (!it.file_path) return;
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(it.file_path, 60, { download: it.file_name ?? undefined });
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.erro("Não foi possível gerar o link.");
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-gray-400">
          As estratégias entregues neste plano (ranqueamento, tráfego, WhatsApp,
          treinamento…). Os vídeos e artes ficam na aba Conteúdos. O cliente vê
          este plano no painel dele.
        </p>
        <button
          type="button"
          onClick={abrirNovo}
          className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + Nova estratégia
        </button>
      </div>

      {/* Formulário (novo/editar) */}
      {form ? (
        <div className="mb-4 space-y-3 rounded-2xl border border-brand-200 bg-brand-50/40 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Estratégia
              </label>
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Ex.: Auditoria de WhatsApp"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Tipo
              </label>
              <select
                value={form.type ?? "Outro"}
                onChange={(e) => set("type", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                {ACTION_PLAN_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Status
              </label>
              <select
                value={form.status ?? "A fazer"}
                onChange={(e) => set("status", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                {DEMAND_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Prazo
              </label>
              <input
                type="date"
                value={form.due_date ?? ""}
                onChange={(e) => set("due_date", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Responsável
              </label>
              <select
                value={form.assignee_id ?? ""}
                onChange={(e) => set("assignee_id", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                <option value="">Sem responsável</option>
                {perfis.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Descrição (o cliente lê)
              </label>
              <textarea
                value={form.description ?? ""}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="O que é e o que vai ser feito nesta estratégia…"
                className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Arquivo */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={enviandoArq}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-300 bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60"
            >
              <Icon nome="upload" className="h-3.5 w-3.5" />
              {enviandoArq
                ? "Enviando…"
                : form.file_name
                  ? "Trocar arquivo"
                  : "Anexar PDF/rotina"}
            </button>
            {form.file_name ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs text-gray-700">
                <Icon nome="file" className="h-3.5 w-3.5 text-gray-400" />
                {form.file_name}
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) =>
                      f ? { ...f, file_path: null, file_name: null } : f,
                    )
                  }
                  className="ml-1 text-gray-400 hover:text-red-600"
                >
                  ✕
                </button>
              </span>
            ) : null}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xlsx,.png,.jpg,.jpeg,image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) enviarArquivo(f);
                e.target.value = "";
              }}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setForm(null)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {salvando ? "Salvando…" : "Salvar estratégia"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Lista */}
      {itens.length === 0 && !form ? (
        <p className="mt-6 text-center text-sm text-gray-500">
          Nenhuma estratégia ainda. Clique em “+ Nova estratégia” para montar o
          plano de ação deste cliente.
        </p>
      ) : (
        <ul className="space-y-2">
          {itens.map((it) => (
            <li
              key={it.id}
              className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                {it.type ? (
                  <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700">
                    {it.type}
                  </span>
                ) : null}
                <span className="text-sm font-semibold text-gray-900">
                  {it.title}
                </span>
                <select
                  value={it.status}
                  onChange={(e) => mudarStatus(it.id, e.target.value)}
                  className={`ml-auto rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold ${DEMAND_STATUS_TONE[it.status as keyof typeof DEMAND_STATUS_TONE] ?? "bg-gray-100 text-gray-600"}`}
                >
                  {DEMAND_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              {it.description ? (
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-gray-600">
                  {it.description}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                {it.due_date ? <span>Prazo: {formatarData(it.due_date)}</span> : null}
                {nomePerfil(it.assignee_id) ? (
                  <span>Resp.: {nomePerfil(it.assignee_id)}</span>
                ) : null}
                {it.file_name ? (
                  <button
                    type="button"
                    onClick={() => baixar(it)}
                    className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
                  >
                    <Icon nome="download" className="h-3.5 w-3.5" />
                    {it.file_name}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => abrirEdicao(it)}
                  className="ml-auto font-semibold text-gray-500 hover:text-gray-700"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => excluir(it)}
                  className="font-semibold text-gray-400 hover:text-red-600"
                >
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
