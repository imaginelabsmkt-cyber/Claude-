"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { atualizarProducaoConteudoAction } from "@/lib/actions/contents";
import { toast } from "@/lib/ui/toast";

export interface AAgendarRow {
  id: string;
  title: string;
  clienteNome: string;
  cor?: string | null;
}

/**
 * Lista compacta dos conteúdos que precisam de gravação mas ainda NÃO têm data.
 * O agendamento é feito pelo botão "+ Agendar gravações" (individual ou lote).
 */
export function AAgendarList({ rows }: { rows: AAgendarRow[] }) {
  const router = useRouter();
  const [processando, iniciar] = useTransition();

  const remover = (id: string) =>
    iniciar(async () => {
      const r = await atualizarProducaoConteudoAction(id, {
        requires_recording: false,
      });
      if (!r.ok) toast.erro(r.error ?? "Não foi possível remover.");
      else toast.sucesso("Removido da lista de gravação");
      router.refresh();
    });

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
        A agendar
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {rows.length}
        </span>
      </h2>
      <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
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
              sem data
            </span>
            <button
              type="button"
              disabled={processando}
              onClick={() => remover(r.id)}
              className="shrink-0 rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
            >
              Não precisa gravar
            </button>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-gray-400">
        Use “+ Agendar gravações” para marcar data e hora (individual ou em lote).
      </p>
    </section>
  );
}
