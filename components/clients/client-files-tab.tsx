"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/ui/toast";
import { formatarData } from "@/lib/utils";
import type { ClientFile } from "@/types";

const BUCKET = "client-files";
const LIMITE_MB = 50;

/** Ícone conforme o tipo do arquivo. */
function iconePorTipo(mime: string | null, nome: string): string {
  const m = (mime ?? "").toLowerCase();
  const ext = nome.toLowerCase().split(".").pop() ?? "";
  if (m.startsWith("image/")) return "🖼️";
  if (m.startsWith("video/")) return "🎬";
  if (m.startsWith("audio/")) return "🎵";
  if (m === "application/pdf" || ext === "pdf") return "📄";
  if (["doc", "docx"].includes(ext)) return "📝";
  if (["xls", "xlsx", "csv"].includes(ext)) return "📊";
  if (["ppt", "pptx"].includes(ext)) return "📽️";
  if (["zip", "rar", "7z"].includes(ext)) return "🗜️";
  return "📎";
}

/** Tamanho legível (KB/MB). */
function formatarTamanho(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Remove caracteres problemáticos do nome para compor o caminho no Storage. */
function nomeSeguro(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-80);
}

export function ClientFilesTab({
  clientId,
  arquivos,
}: {
  clientId: string;
  arquivos: ClientFile[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [removendo, setRemovendo] = useState<string | null>(null);

  const enviarArquivos = async (lista: FileList | File[]) => {
    const files = Array.from(lista);
    if (files.length === 0) return;
    setEnviando(true);
    const { data: auth } = await supabase.auth.getUser();
    let ok = 0;
    for (const file of files) {
      if (file.size > LIMITE_MB * 1024 * 1024) {
        toast.erro(`"${file.name}" passa de ${LIMITE_MB} MB.`);
        continue;
      }
      const path = `${clientId}/${crypto.randomUUID()}-${nomeSeguro(file.name)}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false });
      if (upErr) {
        const msg = /bucket|not found/i.test(upErr.message)
          ? "Armazenamento ainda não ativado. Rode a migração client_files no Supabase."
          : `Não foi possível enviar "${file.name}".`;
        toast.erro(msg);
        continue;
      }
      const { error: insErr } = await supabase.from("client_files").insert({
        client_id: clientId,
        name: file.name,
        path,
        size_bytes: file.size,
        mime_type: file.type || null,
        uploaded_by: auth.user?.id ?? null,
      });
      if (insErr) {
        await supabase.storage.from(BUCKET).remove([path]);
        toast.erro(`Não foi possível registrar "${file.name}".`);
        continue;
      }
      ok += 1;
    }
    setEnviando(false);
    if (ok > 0) {
      toast.sucesso(ok === 1 ? "Arquivo enviado" : `${ok} arquivos enviados`);
      router.refresh();
    }
  };

  const baixar = async (file: ClientFile) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(file.path, 60, { download: file.name });
    if (error || !data?.signedUrl) {
      toast.erro("Não foi possível gerar o link do arquivo.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const remover = async (file: ClientFile) => {
    if (!window.confirm(`Remover "${file.name}"? Esta ação não volta.`)) return;
    setRemovendo(file.id);
    await supabase.storage.from(BUCKET).remove([file.path]);
    const { error } = await supabase
      .from("client_files")
      .delete()
      .eq("id", file.id);
    setRemovendo(null);
    if (error) {
      toast.erro("Não foi possível remover o arquivo.");
      return;
    }
    toast.sucesso("Arquivo removido");
    router.refresh();
  };

  return (
    <div>
      {/* Área de envio (clique ou arraste) */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          if (e.dataTransfer.files?.length) enviarArquivos(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors " +
          (arrastando
            ? "border-brand-500 bg-brand-50"
            : "border-gray-300 bg-gray-50 hover:border-brand-400 hover:bg-brand-50/40")
        }
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) enviarArquivos(e.target.files);
            e.target.value = "";
          }}
        />
        <span className="text-2xl" aria-hidden="true">
          {enviando ? "⏳" : "⬆️"}
        </span>
        <p className="mt-2 text-sm font-medium text-gray-700">
          {enviando
            ? "Enviando…"
            : "Arraste arquivos aqui ou clique para escolher"}
        </p>
        <p className="mt-1 text-xs text-gray-400">
          PDF, imagens, vídeos, documentos… até {LIMITE_MB} MB cada.
        </p>
      </div>

      {/* Lista de arquivos */}
      {arquivos.length === 0 ? (
        <p className="mt-6 text-center text-sm text-gray-500">
          Nenhum arquivo ainda. Envie briefings, referências, contratos, o que
          precisar deixar guardado deste cliente.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {arquivos.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
            >
              <span className="text-xl" aria-hidden="true">
                {iconePorTipo(file.mime_type, file.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {file.name}
                </p>
                <p className="text-xs text-gray-400">
                  {[formatarTamanho(file.size_bytes), formatarData(file.created_at)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => baixar(file)}
                className="rounded-md border border-brand-300 bg-white px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
              >
                ⬇ Baixar
              </button>
              <button
                type="button"
                onClick={() => remover(file)}
                disabled={removendo === file.id}
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
