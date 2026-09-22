"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/ui/toast";
import { cn, formatarData } from "@/lib/utils";
import { COMPANY_FILE_KIND_OPTIONS } from "@/types";
import type { CompanyFile, CompanyFileKind } from "@/types";

const BUCKET = "company-files";
const LIMITE_MB = 20;

/** Deixa o nome do arquivo seguro para virar caminho no Storage. */
function nomeSeguro(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(0, 100);
}

function tamanho(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Documentos da empresa: contrato social, CNPJ, alvará, certidões.
 *
 * O binário vai para o bucket privado `company-files`; o download sai
 * por link assinado de curta duração, então o arquivo nunca fica
 * público.
 *
 * Documento de CLIENTE não entra aqui — ele vive na ficha do cliente.
 */
export function DocumentosPanel({ documentos }: { documentos: CompanyFile[] }) {
  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState<CompanyFileKind>("Outro");
  const [enviando, setEnviando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [filtro, setFiltro] = useState<string>("todos");

  async function enviar(lista: FileList | File[]) {
    const arquivos = Array.from(lista);
    if (arquivos.length === 0) return;

    setEnviando(true);
    const { data: auth } = await supabase.auth.getUser();
    let ok = 0;

    for (const arquivo of arquivos) {
      if (arquivo.size > LIMITE_MB * 1024 * 1024) {
        toast.erro(`"${arquivo.name}" passa de ${LIMITE_MB} MB.`);
        continue;
      }

      const path = `${crypto.randomUUID()}-${nomeSeguro(arquivo.name)}`;
      const { error: erroUpload } = await supabase.storage
        .from(BUCKET)
        .upload(path, arquivo, { upsert: false });

      if (erroUpload) {
        toast.erro(
          /bucket|not found/i.test(erroUpload.message)
            ? "Armazenamento não ativado. Rode a migração empresa no Supabase."
            : `Não foi possível enviar "${arquivo.name}".`,
        );
        continue;
      }

      const { error: erroInsert } = await supabase.from("company_files").insert({
        name: arquivo.name,
        path,
        kind: tipo,
        size_bytes: arquivo.size,
        mime_type: arquivo.type || null,
        uploaded_by: auth.user?.id ?? null,
      });

      if (erroInsert) {
        // Não deixa arquivo órfão no Storage se o registro falhar.
        await supabase.storage.from(BUCKET).remove([path]);
        toast.erro(`Não foi possível registrar "${arquivo.name}".`);
        continue;
      }
      ok += 1;
    }

    setEnviando(false);
    if (ok > 0) {
      toast.sucesso(ok === 1 ? "Documento enviado." : `${ok} documentos enviados.`);
      router.refresh();
    }
  }

  async function baixar(doc: CompanyFile) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.path, 60, { download: doc.name });
    if (error || !data?.signedUrl) {
      toast.erro("Não foi possível gerar o link do arquivo.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function remover(doc: CompanyFile) {
    if (!window.confirm(`Remover "${doc.name}"? Esta ação não volta.`)) return;
    await supabase.storage.from(BUCKET).remove([doc.path]);
    const { error } = await supabase.from("company_files").delete().eq("id", doc.id);
    if (error) {
      toast.erro("Não foi possível remover.");
      return;
    }
    toast.sucesso("Documento removido.");
    router.refresh();
  }

  const visiveis =
    filtro === "todos" ? documentos : documentos.filter((d) => d.kind === filtro);

  const tipos = [...new Set(documentos.map((d) => d.kind))].sort();

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          void enviar(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-xl border border-dashed p-4 transition-colors",
          arrastando ? "border-area bg-area-soft" : "border-gray-300 bg-white",
        )}
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[10rem]">
            <label
              htmlFor="doc-tipo"
              className="mb-1 block text-xs font-medium text-gray-700"
            >
              Tipo do documento
            </label>
            <Select
              id="doc-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as CompanyFileKind)}
            >
              {COMPANY_FILE_KIND_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </Select>
          </div>

          <Button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={enviando}
          >
            {enviando ? "Enviando..." : "Escolher arquivo"}
          </Button>

          <p className="text-xs text-gray-500">
            Ou arraste aqui. Até {LIMITE_MB} MB por arquivo.
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void enviar(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {documentos.length === 0 ? (
        <p className="text-sm text-gray-500">
          Nenhum documento da empresa ainda. Contrato social, cartão CNPJ, alvará e
          certidões ficam aqui — e só quem tem login acessa.
        </p>
      ) : (
        <>
          {tipos.length > 1 ? (
            <Select
              aria-label="Filtrar por tipo"
              className="sm:w-56"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            >
              <option value="todos">Todos os tipos ({documentos.length})</option>
              {tipos.map((k) => (
                <option key={k} value={k}>
                  {k} ({documentos.filter((d) => d.kind === k).length})
                </option>
              ))}
            </Select>
          ) : null}

          <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {visiveis.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                <span className="w-24 shrink-0 rounded bg-area-soft px-1.5 py-0.5 text-center text-[10px] font-bold uppercase tracking-wider text-area">
                  {d.kind}
                </span>
                <span className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => baixar(d)}
                    className="block truncate text-left text-sm font-medium text-gray-900 hover:text-area hover:underline"
                  >
                    {d.name}
                  </button>
                  <span className="block text-xs text-gray-500">
                    {formatarData(d.created_at.slice(0, 10))}
                    {d.size_bytes ? ` · ${tamanho(d.size_bytes)}` : ""}
                  </span>
                </span>
                <Button tamanho="sm" variante="fantasma" onClick={() => remover(d)}>
                  Remover
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
