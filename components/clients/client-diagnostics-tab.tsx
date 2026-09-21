"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/ui/toast";
import { formatarData } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import type { ClientDiagnostic } from "@/types";

const BUCKET = "client-files";
const LIMITE_HTML_MB = 3;
const LIMITE_ARQUIVO_MB = 25;

/** Remove caracteres problemáticos do nome para compor o caminho no Storage. */
function nomeSeguro(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-80);
}

export function ClientDiagnosticsTab({
  clientId,
  diagnosticos,
}: {
  clientId: string;
  diagnosticos: ClientDiagnostic[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [ativo, setAtivo] = useState<string | null>(
    diagnosticos[0]?.id ?? null,
  );
  const [enviando, setEnviando] = useState(false);
  const [telaCheia, setTelaCheia] = useState(false);
  const [urlArquivo, setUrlArquivo] = useState<string | null>(null);

  const selecionado =
    diagnosticos.find((d) => d.id === ativo) ?? diagnosticos[0] ?? null;

  // Diagnóstico em arquivo (PDF etc.): gera URL assinada para exibir no iframe.
  useEffect(() => {
    let vivo = true;
    setUrlArquivo(null);
    if (!selecionado?.path) return;
    supabase.storage
      .from(BUCKET)
      .createSignedUrl(selecionado.path, 60 * 60)
      .then(({ data, error }) => {
        if (!vivo) return;
        if (error || !data?.signedUrl) {
          toast.erro("Não foi possível abrir o arquivo do diagnóstico.");
          return;
        }
        setUrlArquivo(data.signedUrl);
      });
    return () => {
      vivo = false;
    };
  }, [selecionado?.id, selecionado?.path, supabase]);

  const salvarHTML = async (title: string, html: string) => {
    if (html.length > LIMITE_HTML_MB * 1024 * 1024) {
      toast.erro(`O diagnóstico passa de ${LIMITE_HTML_MB} MB.`);
      return;
    }
    if (!/<html|<body|<!doctype|<div|<section/i.test(html)) {
      toast.erro("Isso não parece um HTML de diagnóstico.");
      return;
    }
    setEnviando(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("client_diagnostics").insert({
      client_id: clientId,
      title: title.trim() || "Diagnóstico",
      html,
      path: null,
      mime_type: null,
      uploaded_by: auth.user?.id ?? null,
    });
    setEnviando(false);
    if (error) {
      toast.erro("Não foi possível salvar o diagnóstico.");
      return;
    }
    toast.sucesso("Diagnóstico salvo");
    router.refresh();
  };

  const salvarArquivo = async (title: string, file: File) => {
    if (file.size > LIMITE_ARQUIVO_MB * 1024 * 1024) {
      toast.erro(`O arquivo passa de ${LIMITE_ARQUIVO_MB} MB.`);
      return;
    }
    setEnviando(true);
    const { data: auth } = await supabase.auth.getUser();
    const path = `${clientId}/diagnosticos/${crypto.randomUUID()}-${nomeSeguro(file.name)}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (upErr) {
      setEnviando(false);
      const msg = /bucket|not found/i.test(upErr.message)
        ? "Armazenamento ainda não ativado. Rode a migração client_files no Supabase."
        : "Não foi possível enviar o arquivo.";
      toast.erro(msg);
      return;
    }
    const { error: insErr } = await supabase.from("client_diagnostics").insert({
      client_id: clientId,
      title: title.trim() || "Diagnóstico",
      html: null,
      path,
      mime_type: file.type || "application/pdf",
      uploaded_by: auth.user?.id ?? null,
    });
    setEnviando(false);
    if (insErr) {
      await supabase.storage.from(BUCKET).remove([path]);
      toast.erro("Não foi possível salvar o diagnóstico.");
      return;
    }
    toast.sucesso("Diagnóstico salvo");
    router.refresh();
  };

  const aoEscolherArquivo = async (file: File) => {
    const ehHTML =
      file.type === "text/html" || /\.html?$/i.test(file.name);
    const titulo = file.name.replace(/\.(html?|pdf|png|jpe?g|webp)$/i, "");
    if (ehHTML) {
      await salvarHTML(titulo, await file.text());
    } else {
      await salvarArquivo(titulo, file);
    }
  };

  const remover = async (d: ClientDiagnostic) => {
    if (!window.confirm(`Remover "${d.title ?? "diagnóstico"}"?`)) return;
    if (d.path) await supabase.storage.from(BUCKET).remove([d.path]);
    const { error } = await supabase
      .from("client_diagnostics")
      .delete()
      .eq("id", d.id);
    if (error) {
      toast.erro("Não foi possível remover.");
      return;
    }
    toast.sucesso("Diagnóstico removido");
    if (ativo === d.id) setAtivo(null);
    router.refresh();
  };

  const abrirEmNovaAba = () => {
    if (urlArquivo) window.open(urlArquivo, "_blank");
  };

  return (
    <div>
      {/* Enviar diagnóstico */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Diagnóstico do cliente
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            A análise profunda (Instagram, concorrência, plano). Anexe o
            arquivo (PDF ou HTML) que ele aparece bonitão aqui.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={enviando}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          <Icon nome="upload" className="h-4 w-4" />
          {enviando ? "Salvando…" : "Anexar diagnóstico"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.html,.htm,application/pdf,text/html"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) aoEscolherArquivo(f);
            e.target.value = "";
          }}
        />
      </div>

      {diagnosticos.length === 0 ? (
        <p className="mt-6 text-center text-sm text-gray-500">
          Nenhum diagnóstico ainda. Anexe o PDF (ou HTML) do diagnóstico para
          guardá-lo aqui, sempre à mão.
        </p>
      ) : (
        <>
          {/* Seletor quando há mais de um */}
          {diagnosticos.length > 1 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {diagnosticos.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setAtivo(d.id)}
                  className={
                    "rounded-full border px-3 py-1 text-xs font-medium " +
                    (selecionado?.id === d.id
                      ? "border-brand-300 bg-brand-50 text-brand-700"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50")
                  }
                >
                  {d.title ?? "Diagnóstico"} · {formatarData(d.created_at)}
                </button>
              ))}
            </div>
          ) : null}

          {selecionado ? (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-700">
                  {selecionado.title ?? "Diagnóstico"}
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    {formatarData(selecionado.created_at)}
                  </span>
                </p>
                <div className="flex items-center gap-2">
                  {selecionado.path ? (
                    <button
                      type="button"
                      onClick={abrirEmNovaAba}
                      disabled={!urlArquivo}
                      className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      ↗ Abrir
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setTelaCheia(true)}
                      className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      ⛶ Tela cheia
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remover(selecionado)}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    Remover
                  </button>
                </div>
              </div>
              {selecionado.path ? (
                urlArquivo ? (
                  <iframe
                    title={selecionado.title ?? "Diagnóstico"}
                    src={urlArquivo}
                    className="h-[72vh] w-full rounded-xl border border-gray-200 bg-white shadow-sm"
                  />
                ) : (
                  <div className="flex h-[72vh] w-full items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-400">
                    Abrindo o arquivo…
                  </div>
                )
              ) : (
                <iframe
                  title={selecionado.title ?? "Diagnóstico"}
                  srcDoc={selecionado.html ?? ""}
                  sandbox="allow-scripts"
                  className="h-[72vh] w-full rounded-xl border border-gray-200 bg-white shadow-sm"
                />
              )}
            </div>
          ) : null}
        </>
      )}

      {/* Tela cheia (HTML) */}
      {telaCheia && selecionado && !selecionado.path ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h2 className="text-base font-bold text-gray-900">
              {selecionado.title ?? "Diagnóstico"}
            </h2>
            <button
              type="button"
              onClick={() => setTelaCheia(false)}
              className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-700"
            >
              ✕ Fechar
            </button>
          </div>
          <iframe
            title={selecionado.title ?? "Diagnóstico"}
            srcDoc={selecionado.html ?? ""}
            sandbox="allow-scripts"
            className="flex-1 w-full"
          />
        </div>
      ) : null}
    </div>
  );
}
