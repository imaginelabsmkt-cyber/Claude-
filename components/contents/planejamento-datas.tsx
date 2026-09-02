"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  alterarDataPostagemAction,
  atualizarProducaoConteudoAction,
} from "@/lib/actions/contents";
import { toast } from "@/lib/ui/toast";

/**
 * Datas do planejamento editáveis direto na ficha do conteúdo:
 * - Data prevista (planned_date) => também atualiza o evento no Google.
 * - Data real (actual_post_date) => quando cai em outro mês, move o conteúdo
 *   para o mês em que realmente saiu.
 * Salva ao sair do campo (onBlur); só chama a ação se o valor mudou.
 */
export function PlanejamentoDatas({
  contentId,
  plannedDate,
  actualPostDate,
}: {
  contentId: string;
  plannedDate: string | null;
  actualPostDate: string | null;
}) {
  const router = useRouter();
  const [prevista, setPrevista] = useState(plannedDate ?? "");
  const [real, setReal] = useState(actualPostDate ?? "");
  const [salvando, iniciar] = useTransition();

  // Reflete mudanças vindas do servidor (ex.: após revalidar).
  useEffect(() => {
    if (!salvando) {
      setPrevista(plannedDate ?? "");
      setReal(actualPostDate ?? "");
    }
  }, [plannedDate, actualPostDate, salvando]);

  function salvarPrevista() {
    const novo = prevista || null;
    if (novo === (plannedDate ?? null)) return;
    iniciar(async () => {
      const r = await alterarDataPostagemAction(contentId, novo);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível salvar a data prevista.");
        setPrevista(plannedDate ?? "");
      } else {
        toast.sucesso("Data prevista atualizada.");
      }
      router.refresh();
    });
  }

  function salvarReal() {
    const novo = real || null;
    if (novo === (actualPostDate ?? null)) return;
    iniciar(async () => {
      const r = await atualizarProducaoConteudoAction(contentId, {
        actual_post_date: novo,
      });
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível salvar a data real.");
        setReal(actualPostDate ?? "");
      } else {
        toast.sucesso("Data real atualizada.");
      }
      router.refresh();
    });
  }

  return (
    <>
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">
          Data prevista
        </p>
        <input
          type="date"
          value={prevista}
          disabled={salvando}
          onChange={(e) => setPrevista(e.target.value)}
          onBlur={salvarPrevista}
          className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
        />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">
          Data real
        </p>
        <input
          type="date"
          value={real}
          disabled={salvando}
          onChange={(e) => setReal(e.target.value)}
          onBlur={salvarReal}
          className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
        />
        <p className="mt-1 text-[11px] text-gray-400">
          Deixe em branco se ainda não foi postado.
        </p>
      </div>
    </>
  );
}
