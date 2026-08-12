"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adicionarFilaEdicaoAction } from "@/lib/actions/contents";
import { toast } from "@/lib/ui/toast";
import { formatarData, cn } from "@/lib/utils";

export interface GravadoRow {
  id: string;
  title: string;
  clienteNome: string;
  cor?: string | null;
  recording_date: string | null;
}

/** Lista compacta e recolhível dos conteúdos já gravados. */
export function GravadosList({ rows }: { rows: GravadoRow[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [processando, iniciar] = useTransition();

  const paraFila = (id: string) =>
    iniciar(async () => {
      const r = await adicionarFilaEdicaoAction(id);
      if (!r.ok) toast.erro(r.error ?? "Não foi possível enviar.");
      else toast.sucesso("Enviado para a fila de edição");
      router.refresh();
    });

  return (
    <section>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900"
      >
        <span
          className={cn(
            "text-gray-400 transition-transform",
            aberto ? "rotate-90" : "",
          )}
          aria-hidden="true"
        >
          ▶
        </span>
        Já gravados
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {rows.length}
        </span>
      </button>

      {aberto ? (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 px-3 py-2 text-sm"
            >
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-gray-200"
                style={{ backgroundColor: r.cor ?? "#e5e7eb" }}
                aria-hidden="true"
              />
              <span className="max-w-[8rem] shrink-0 truncate text-xs font-medium text-gray-500">
                {r.clienteNome}
              </span>
              <Link
                href={`/conteudos/${r.id}`}
                className="flex-1 truncate text-gray-800 hover:text-brand-700"
              >
                {r.title}
              </Link>
              <span className="hidden shrink-0 text-xs text-gray-400 sm:inline">
                {formatarData(r.recording_date)}
              </span>
              <button
                type="button"
                disabled={processando}
                onClick={() => paraFila(r.id)}
                className="shrink-0 rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                → Fila de edição
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
