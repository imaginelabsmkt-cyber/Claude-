"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/ui/toast";
import { salvarNotaSemanalAction } from "@/lib/actions/relatorio-semanal";

/**
 * Editor do relatório da semana (o "nosso lado"). A equipe escreve como foi a
 * semana e isso aparece no painel do cliente, na semana correspondente.
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
  inicial: string | null;
}) {
  const router = useRouter();
  const [note, setNote] = useState(inicial ?? "");
  const [salvando, iniciar] = useTransition();
  const sujo = (inicial ?? "") !== note;

  const salvar = () =>
    iniciar(async () => {
      const r = await salvarNotaSemanalAction(clientId, weekStart, note);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível salvar.");
        return;
      }
      toast.sucesso("Relatório da semana salvo");
      router.refresh();
    });

  return (
    <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-brand-800">
            Relatório da semana (para o cliente)
          </h3>
          <p className="text-xs text-gray-500">
            Semana de {intervalo}. Escreva como foi a semana. O cliente vê isso
            no painel dele. Use as setas da semana acima para trocar de semana.
          </p>
        </div>
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        placeholder="Ex.: Essa semana publicamos 3 conteúdos, gravamos o Reel sobre X e começamos os anúncios da campanha Y. O engajamento subiu em relação à semana passada…"
        className="mt-2 w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-brand-500"
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        {sujo ? (
          <span className="mr-auto text-xs text-gray-500">
            Alterações não salvas.
          </span>
        ) : null}
        <button
          type="button"
          onClick={salvar}
          disabled={salvando || !sujo}
          className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {salvando ? "Salvando…" : "Salvar relatório da semana"}
        </button>
      </div>
    </div>
  );
}
