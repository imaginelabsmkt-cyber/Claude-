"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/ui/toast";
import { Icon } from "@/components/ui/icon";
import { salvarNotaSemanalAction } from "@/lib/actions/relatorio-semanal";
import type { NotaSemanal } from "@/lib/data/resultados";

const BUCKET = "client-files";
const LIMITE_MB = 25;

function nomeSeguro(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-80);
}

/**
 * Editor do relatório da semana (o "nosso lado"): texto e/ou arquivo (Excel,
 * PDF, print). A equipe escreve/sobe e isso aparece no painel do cliente, na
 * semana correspondente.
 */
export function ClientWeeklyNote({
  clientId,
  weekStart,
  intervalo,
  inicial,
}: {
  clientId: string;
  weekStart: string; // 'YYYY-MM-DD' (segunda)
  intervalo: string; // ex.: "22/set a 28/set"
  inicial: NotaSemanal;
}) {
  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState(inicial.note ?? "");
  const [fileName, setFileName] = useState<string | null>(inicial.fileName);
  const [salvando, iniciar] = useTransition();
  const [enviandoArq, setEnviandoArq] = useState(false);
  const sujo = (inicial.note ?? "") !== note;

  const salvarTexto = () =>
    iniciar(async () => {
      const r = await salvarNotaSemanalAction(clientId, weekStart, note);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível salvar.");
        return;
      }
      toast.sucesso("Relatório da semana salvo");
      router.refresh();
    });

  const enviarArquivo = async (file: File) => {
    if (file.size > LIMITE_MB * 1024 * 1024) {
      toast.erro(`O arquivo passa de ${LIMITE_MB} MB.`);
      return;
    }
    setEnviandoArq(true);
    const path = `${clientId}/relatorios-semana/${weekStart}-${crypto.randomUUID()}-${nomeSeguro(file.name)}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (upErr) {
      setEnviandoArq(false);
      const msg = /bucket|not found/i.test(upErr.message)
        ? "Armazenamento ainda não ativado. Rode a migração client_files no Supabase."
        : "Não foi possível enviar o arquivo.";
      toast.erro(msg);
      return;
    }
    const r = await salvarNotaSemanalAction(clientId, weekStart, note, {
      path,
      name: file.name,
    });
    setEnviandoArq(false);
    if (!r.ok) {
      await supabase.storage.from(BUCKET).remove([path]);
      toast.erro(r.error ?? "Não foi possível salvar o arquivo.");
      return;
    }
    setFileName(file.name);
    toast.sucesso("Arquivo enviado");
    router.refresh();
  };

  const removerArquivo = async () => {
    if (!window.confirm("Remover o arquivo do relatório desta semana?")) return;
    const r = await salvarNotaSemanalAction(clientId, weekStart, note, null);
    if (!r.ok) {
      toast.erro(r.error ?? "Não foi possível remover.");
      return;
    }
    setFileName(null);
    toast.sucesso("Arquivo removido");
    router.refresh();
  };

  return (
    <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-50/40 p-4">
      <h3 className="text-sm font-semibold text-brand-800">
        Relatório da semana (para o cliente)
      </h3>
      <p className="text-xs text-gray-500">
        Semana de {intervalo}. Escreva como foi a semana e/ou suba o relatório
        em arquivo (Excel, PDF, print). O cliente vê isso no painel dele. Use as
        setas da semana acima para trocar de semana.
      </p>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        placeholder="Ex.: Essa semana publicamos 3 conteúdos, gravamos o Reel sobre X e começamos os anúncios da campanha Y…"
        className="mt-2 w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-brand-500"
      />

      {/* Arquivo do relatório */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={enviandoArq}
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-300 bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60"
        >
          <Icon nome="upload" className="h-3.5 w-3.5" />
          {enviandoArq ? "Enviando…" : fileName ? "Trocar arquivo" : "Subir arquivo (Excel/PDF)"}
        </button>
        {fileName ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs text-gray-700">
            <Icon nome="file" className="h-3.5 w-3.5 text-gray-400" />
            {fileName}
            <button
              type="button"
              onClick={removerArquivo}
              title="Remover"
              className="ml-1 text-gray-400 hover:text-red-600"
            >
              ✕
            </button>
          </span>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/pdf,image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) enviarArquivo(f);
            e.target.value = "";
          }}
        />
      </div>

      <div className="mt-2 flex items-center justify-end gap-2">
        {sujo ? (
          <span className="mr-auto text-xs text-gray-500">
            Alterações de texto não salvas.
          </span>
        ) : null}
        <button
          type="button"
          onClick={salvarTexto}
          disabled={salvando || !sujo}
          className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {salvando ? "Salvando…" : "Salvar texto"}
        </button>
      </div>
    </div>
  );
}
