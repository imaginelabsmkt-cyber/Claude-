"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/ui/toast";
import { Icon } from "@/components/ui/icon";
import { formatarData } from "@/lib/utils";
import { parsePlanoAcao, type ItemPlano } from "@/lib/import/plano-parser";
import {
  salvarEstrategiaAction,
  statusEstrategiaAction,
  excluirEstrategiaAction,
  importarCronogramaAction,
  gerarTarefaDoItemAction,
  type DadosEstrategia,
} from "@/lib/actions/action-plan";
import {
  ACTION_PLAN_TYPES,
  DEMAND_STATUS_OPTIONS,
  DEMAND_STATUS_TONE,
  PLANO_OWNERS,
  PLANO_OWNER_TONE,
  PLANO_STAGES,
  PLANO_STAGE_RESUMO,
  PLANO_STATUS_LABEL,
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
  type: "Outro",
  status: "A fazer",
  description: "",
  due_date: "",
  assignee_id: "",
  file_path: null,
  file_name: null,
  owner: "FAVIE",
  stage: "",
  date_label: "",
};

/** Rótulo de data de um item: usa o texto da previsão, senão a data real. */
function rotuloData(it: ActionPlanItem): string | null {
  if (it.date_label?.trim()) return it.date_label.trim();
  if (it.due_date) return formatarData(it.due_date);
  return null;
}

export function ClientActionPlan({
  clientId,
  itens: itensProp,
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

  // Palpite otimista por item (status): a tela muda NA HORA no clique, sem
  // esperar o servidor nem recarregar a página. Zera quando chegam dados novos.
  const [otim, setOtim] = useState<Record<string, Partial<ActionPlanItem>>>({});
  useEffect(() => setOtim({}), [itensProp]);
  const itens = useMemo(
    () => itensProp.map((i) => (otim[i.id] ? { ...i, ...otim[i.id] } : i)),
    [itensProp, otim],
  );

  // Importação do plano (arquivo PDF ou texto colado).
  const [importOpen, setImportOpen] = useState(false);
  const [texto, setTexto] = useState("");
  const [preview, setPreview] = useState<ItemPlano[] | null>(null);
  const [lendoPdf, setLendoPdf] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

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
      owner: it.owner ?? "FAVIE",
      stage: it.stage ?? "",
      date_label: it.date_label ?? "",
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
      toast.sucesso("Item salvo");
      setForm(null);
      router.refresh();
    });

  // Muda o status NA HORA (otimista) e salva no servidor em segundo plano, SEM
  // recarregar a página (era isso que travava a cada clique).
  const mudarStatus = (id: string, status: string) => {
    setOtim((o) => ({ ...o, [id]: { ...o[id], status } }));
    iniciar(async () => {
      const r = await statusEstrategiaAction(clientId, id, status);
      if (!r.ok) {
        toast.erro(r.error ?? "Erro");
        setOtim((o) => {
          const { [id]: _, ...resto } = o;
          return resto; // desfaz o palpite
        });
      }
    });
  };

  // Check rápido: liga/desliga "Feito" com um clique (sem abrir o seletor).
  const alternarFeito = (it: ActionPlanItem) =>
    mudarStatus(it.id, it.status === "Feita" ? "A fazer" : "Feita");

  const excluir = (it: ActionPlanItem) =>
    iniciar(async () => {
      if (!window.confirm(`Remover "${it.title}"?`)) return;
      const r = await excluirEstrategiaAction(clientId, it.id);
      if (!r.ok) toast.erro(r.error ?? "Erro");
      else {
        toast.sucesso("Item removido");
        router.refresh();
      }
    });

  const gerarTarefa = (it: ActionPlanItem) =>
    iniciar(async () => {
      const r = await gerarTarefaDoItemAction(clientId, it.id);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível gerar a tarefa.");
        return;
      }
      toast.sucesso(
        r.kind === "ensaio"
          ? "Virou ensaio — já está nas Produções"
          : "Virou demanda com etapas",
      );
      router.refresh();
    });

  const baixar = async (it: ActionPlanItem) => {
    if (!it.file_path) return;
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(it.file_path, 60, { download: it.file_name ?? undefined });
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.erro("Não foi possível gerar o link.");
  };

  // --- Importação ---------------------------------------------------------
  const subirArquivo = async (file: File) => {
    setLendoPdf(true);
    try {
      let txt = "";
      if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") {
        const { lerTextoPdf } = await import("@/lib/import/ler-pdf");
        txt = await lerTextoPdf(file);
      } else {
        txt = await file.text(); // .txt
      }
      if (!txt.trim()) {
        toast.erro("Não consegui ler texto desse arquivo.");
        return;
      }
      setTexto(txt);
      const achados = parsePlanoAcao(txt, new Date().getFullYear());
      if (achados.length === 0) {
        toast.erro(
          "Li o arquivo, mas não achei itens com responsável. Confira o texto abaixo e ajuste.",
        );
      } else {
        setPreview(achados);
      }
    } catch {
      toast.erro("Não foi possível ler o PDF. Tente colar o texto.");
    } finally {
      setLendoPdf(false);
    }
  };

  const analisar = () => {
    const achados = parsePlanoAcao(texto, new Date().getFullYear());
    if (achados.length === 0) {
      toast.erro(
        "Não encontrei itens. Cada linha de tarefa precisa terminar com quem faz (FAVIE, Vocês fazem, Anúncios).",
      );
      return;
    }
    setPreview(achados);
  };

  const confirmarImport = () =>
    iniciar(async () => {
      if (!preview?.length) return;
      const r = await importarCronogramaAction(
        clientId,
        preview.map((i) => ({
          title: i.titulo,
          owner: i.owner,
          status: i.status,
          date_label: i.dateLabel,
          due_date: i.dueDate,
          stage: i.stage,
        })),
      );
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível importar.");
        return;
      }
      toast.sucesso(`${r.quantidade ?? 0} item(ns) importado(s)`);
      setImportOpen(false);
      setTexto("");
      setPreview(null);
      router.refresh();
    });

  // Agrupa por etapa (na ordem do mês); itens sem etapa caem em "Outros".
  const grupos = useMemo(() => {
    const porEtapa = new Map<string, ActionPlanItem[]>();
    const ordenar = (a: ActionPlanItem, b: ActionPlanItem) => {
      // Feitos descem pro fim, pra sobrar o que falta em evidência.
      const fa = a.status === "Feita" ? 1 : 0;
      const fb = b.status === "Feita" ? 1 : 0;
      if (fa !== fb) return fa - fb;
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return a.position - b.position;
    };
    for (const it of itens) {
      const chave = it.stage && PLANO_STAGES.includes(it.stage as never)
        ? it.stage
        : "Outros";
      porEtapa.set(chave, [...(porEtapa.get(chave) ?? []), it]);
    }
    const ordem = [...PLANO_STAGES, "Outros"];
    return ordem
      .filter((e) => porEtapa.has(e))
      .map((e) => ({ etapa: e, lista: (porEtapa.get(e) ?? []).sort(ordenar) }));
  }, [itens]);

  const temEtapas = grupos.some((g) => g.etapa !== "Outros");
  const feitosCount = itens.filter((i) => i.status === "Feita").length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] text-gray-400">
            O cronograma do mês: o que a FAVIE faz, o que precisamos do cliente,
            com data e status. O cliente vê este plano no painel dele.
          </p>
          {itens.length > 0 ? (
            <p className="mt-1 text-xs font-semibold text-gray-600">
              {feitosCount}/{itens.length} feitos · clique no ✓ pra dar como feito
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => {
              setImportOpen(true);
              setPreview(null);
            }}
            className="rounded-lg border border-brand-300 bg-white px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          >
            Importar do texto
          </button>
          <button
            type="button"
            onClick={abrirNovo}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            + Novo item
          </button>
        </div>
      </div>

      {/* Formulário (novo/editar) */}
      {form ? (
        <div className="mb-4 space-y-3 rounded-2xl border border-brand-200 bg-brand-50/40 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Item do plano
              </label>
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Ex.: Sessão de fotos e gravação dos vídeos"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Quem faz
              </label>
              <select
                value={form.owner ?? "FAVIE"}
                onChange={(e) => set("owner", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                {PLANO_OWNERS.map((o) => (
                  <option key={o} value={o}>
                    {o === "FAVIE" ? "FAVIE (equipe)" : "Cliente"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Etapa do mês
              </label>
              <select
                value={form.stage ?? ""}
                onChange={(e) => set("stage", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                <option value="">Sem etapa</option>
                {PLANO_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Previsão (texto)
              </label>
              <input
                value={form.date_label ?? ""}
                onChange={(e) => set("date_label", e.target.value)}
                placeholder="Ex.: 05 a 09/10, toda semana"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Data (para ordenar)
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
                Status
              </label>
              <select
                value={form.status ?? "A fazer"}
                onChange={(e) => set("status", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                {DEMAND_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {PLANO_STATUS_LABEL[s] ?? s}
                  </option>
                ))}
              </select>
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
                Responsável (equipe)
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
                placeholder="O que é e o que vai ser feito neste item…"
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
              {salvando ? "Salvando…" : "Salvar item"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Lista agrupada por etapa */}
      {itens.length === 0 && !form ? (
        <p className="mt-6 text-center text-sm text-gray-500">
          Nenhum item ainda. Clique em “Importar do texto” para colar o plano, ou
          em “+ Novo item” para montar na mão.
        </p>
      ) : (
        <div className="space-y-5">
          {grupos.map(({ etapa, lista }) => (
            <div key={etapa}>
              {temEtapas ? (
                <div className="mb-2 flex items-baseline gap-2">
                  <h4 className="text-sm font-bold text-gray-800">
                    {etapa === "Outros" ? "Outros itens" : etapa}
                  </h4>
                  {PLANO_STAGE_RESUMO[etapa] ? (
                    <span className="text-[11px] text-gray-400">
                      {PLANO_STAGE_RESUMO[etapa]}
                    </span>
                  ) : null}
                </div>
              ) : null}
              <ul className="space-y-2">
                {lista.map((it) => {
                  const feito = it.status === "Feita";
                  return (
                  <li
                    key={it.id}
                    className={`rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-opacity ${feito ? "opacity-60" : ""}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Check rápido pra dar como feito. */}
                      <button
                        type="button"
                        aria-label={feito ? "Reabrir" : "Marcar como feito"}
                        title={feito ? "Reabrir" : "Marcar como feito"}
                        disabled={salvando}
                        onClick={() => alternarFeito(it)}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] text-white transition-colors ${feito ? "border-green-600 bg-green-600" : "border-gray-300 hover:border-green-500"}`}
                      >
                        {feito ? "✓" : ""}
                      </button>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${PLANO_OWNER_TONE[it.owner ?? "FAVIE"] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {it.owner === "Cliente" ? "Cliente" : "FAVIE"}
                      </span>
                      {rotuloData(it) ? (
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                          {rotuloData(it)}
                        </span>
                      ) : null}
                      <span
                        className={`text-sm font-semibold ${feito ? "text-gray-400 line-through" : "text-gray-900"}`}
                      >
                        {it.title}
                      </span>
                      <select
                        value={it.status}
                        onChange={(e) => mudarStatus(it.id, e.target.value)}
                        className={`ml-auto rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold ${DEMAND_STATUS_TONE[it.status as keyof typeof DEMAND_STATUS_TONE] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {DEMAND_STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {PLANO_STATUS_LABEL[s] ?? s}
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
                      {it.type && it.type !== "Outro" ? (
                        <span>{it.type}</span>
                      ) : null}
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
                      {/* Virar tarefa: só pra itens da FAVIE ainda sem vínculo. */}
                      {it.owner !== "Cliente" &&
                      !it.linked_demand_id &&
                      !it.linked_content_id ? (
                        <button
                          type="button"
                          onClick={() => gerarTarefa(it)}
                          disabled={salvando}
                          className="inline-flex items-center gap-1 rounded-md border border-brand-300 bg-white px-2 py-0.5 font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60"
                        >
                          + Gerar tarefa
                        </button>
                      ) : null}
                      {it.linked_content_id ? (
                        <a
                          href="/gravacoes"
                          className="inline-flex items-center gap-1 font-semibold text-green-700 hover:underline"
                        >
                          ✓ Virou ensaio
                        </a>
                      ) : null}
                      {it.linked_demand_id ? (
                        <a
                          href="/demandas"
                          className="inline-flex items-center gap-1 font-semibold text-green-700 hover:underline"
                        >
                          ✓ Virou demanda
                        </a>
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
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Modal de importação */}
      {importOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">
                Importar plano do texto
              </h3>
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {!preview ? (
              <>
                <p className="mb-3 text-xs text-gray-500">
                  Suba o <strong>PDF do plano</strong> que o sistema lê sozinho,
                  ou cole o texto do cronograma. Você revisa tudo antes de criar.
                </p>

                <div className="mb-3">
                  <button
                    type="button"
                    onClick={() => importFileRef.current?.click()}
                    disabled={lendoPdf}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    <Icon nome="upload" className="h-4 w-4" />
                    {lendoPdf ? "Lendo o PDF…" : "Subir PDF do plano"}
                  </button>
                  <input
                    ref={importFileRef}
                    type="file"
                    accept=".pdf,.txt,application/pdf,text/plain"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) subirArquivo(f);
                      e.target.value = "";
                    }}
                  />
                  <span className="ml-2 text-[11px] text-gray-400">
                    ou cole o texto abaixo
                  </span>
                </div>

                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  rows={12}
                  placeholder={"30/09\nAprovação do plano de ação Vocês fazem\n01/10\nSessão de fotos e gravação dos vídeos FAVIE\n05 a 09/10 Auditoria e ajuste do Google FAVIE"}
                  className="w-full flex-1 resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:border-brand-500"
                />
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setImportOpen(false)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={analisar}
                    disabled={!texto.trim()}
                    className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    Analisar
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mb-2 text-xs text-gray-500">
                  Encontrei <strong>{preview.length}</strong> item(ns). Revise,
                  ajuste quem faz e remova o que não quiser antes de criar.
                </p>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-2">
                  {preview.map((it, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-2"
                    >
                      {it.dateLabel ? (
                        <span className="rounded bg-white px-1.5 py-0.5 text-[11px] text-gray-500">
                          {it.dateLabel}
                        </span>
                      ) : null}
                      <input
                        value={it.titulo}
                        onChange={(e) =>
                          setPreview((p) =>
                            p
                              ? p.map((x, i) =>
                                  i === idx ? { ...x, titulo: e.target.value } : x,
                                )
                              : p,
                          )
                        }
                        className="min-w-0 flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-sm outline-none focus:border-brand-500"
                      />
                      <select
                        value={it.owner}
                        onChange={(e) =>
                          setPreview((p) =>
                            p
                              ? p.map((x, i) =>
                                  i === idx
                                    ? {
                                        ...x,
                                        owner: e.target.value as ItemPlano["owner"],
                                      }
                                    : x,
                                )
                              : p,
                          )
                        }
                        className="rounded border border-gray-200 bg-white px-1.5 py-1 text-xs outline-none focus:border-brand-500"
                      >
                        <option value="FAVIE">FAVIE</option>
                        <option value="Cliente">Cliente</option>
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          setPreview((p) =>
                            p ? p.filter((_, i) => i !== idx) : p,
                          )
                        }
                        className="text-gray-400 hover:text-red-600"
                        title="Remover"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPreview(null)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={confirmarImport}
                    disabled={salvando || preview.length === 0}
                    className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    {salvando ? "Criando…" : `Criar ${preview.length} item(ns)`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
