"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/ui/toast";
import { formatarData } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import type { ClientReport } from "@/types";

const BUCKET = "client-files";
const LIMITE_MB = 50;

function nomeSeguro(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-80);
}

function mesAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function rotuloMes(ref: string | null): string {
  if (!ref || !/^\d{4}-\d{2}$/.test(ref)) return "Sem mês";
  const [ano, mes] = ref.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(ano, mes - 1, 1));
}

export function ClientReportsTab({
  clientId,
  relatorios,
}: {
  clientId: string;
  relatorios: ClientReport[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mes, setMes] = useState(mesAtual());
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [removendo, setRemovendo] = useState<string | null>(null);

  const enviar = async (file: File) => {
    if (file.size > LIMITE_MB * 1024 * 1024) {
      toast.erro(`"${file.name}" passa de ${LIMITE_MB} MB.`);
      return;
    }
    setEnviando(true);
    const { data: auth } = await supabase.auth.getUser();
    const path = `${clientId}/relatorios/${crypto.randomUUID()}-${nomeSeguro(file.name)}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false });
    if (upErr) {
      setEnviando(false);
      toast.erro(
        /bucket|not found/i.test(upErr.message)
          ? "Armazenamento ainda não ativado. Rode a migração no Supabase."
          : "Não foi possível enviar o relatório.",
      );
      return;
    }
    const { error: insErr } = await supabase.from("client_reports").insert({
      client_id: clientId,
      reference_month: mes || null,
      title: rotuloMes(mes || null),
      path,
      file_name: file.name,
      size_bytes: file.size,
      mime_type: file.type || null,
      notes: notas.trim() || null,
      uploaded_by: auth.user?.id ?? null,
    });
    setEnviando(false);
    if (insErr) {
      await supabase.storage.from(BUCKET).remove([path]);
      toast.erro("Não foi possível registrar o relatório.");
      return;
    }
    toast.sucesso("Relatório enviado");
    setNotas("");
    router.refresh();
  };

  const baixar = async (r: ClientReport) => {
    if (!r.path) return;
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(r.path, 60, { download: r.file_name ?? undefined });
    if (error || !data?.signedUrl) {
      toast.erro("Não foi possível abrir o relatório.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const remover = async (r: ClientReport) => {
    if (!window.confirm(`Remover o relatório de ${rotuloMes(r.reference_month)}?`))
      return;
    setRemovendo(r.id);
    if (r.path) await supabase.storage.from(BUCKET).remove([r.path]);
    const { error } = await supabase
      .from("client_reports")
      .delete()
      .eq("id", r.id);
    setRemovendo(null);
    if (error) {
      toast.erro("Não foi possível remover.");
      return;
    }
    toast.sucesso("Relatório removido");
    router.refresh();
  };

  return (
    <div>
      {/* Enviar novo relatório */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Enviar relatório</h3>
        <p className="mt-0.5 text-xs text-gray-500">
          Escolha o mês de referência e anexe o relatório (PDF, imagem ou
          planilha). Depois eu organizo a leitura por aqui.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Mês de referência
            </label>
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Observações (opcional)
            </label>
            <input
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ex.: relatório quinzenal, foco em alcance…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={enviando}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            <Icon nome="upload" className="h-4 w-4" />
            {enviando ? "Enviando…" : "Anexar relatório"}
          </button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) enviar(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Lista de relatórios */}
      {relatorios.length === 0 ? (
        <p className="mt-6 text-center text-sm text-gray-500">
          Nenhum relatório ainda. Envie o primeiro para acompanhar a evolução do
          cliente mês a mês.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {relatorios.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                <Icon nome="report" className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium capitalize text-gray-900">
                  {rotuloMes(r.reference_month)}
                </p>
                <p className="truncate text-xs text-gray-400">
                  {[r.file_name, r.notes, formatarData(r.created_at)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => baixar(r)}
                className="inline-flex items-center gap-1 rounded-md border border-brand-300 bg-white px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
              >
                <Icon nome="download" className="h-3.5 w-3.5" />
                Abrir
              </button>
              <button
                type="button"
                onClick={() => remover(r)}
                disabled={removendo === r.id}
                title="Remover"
                className="rounded-md px-2 py-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
