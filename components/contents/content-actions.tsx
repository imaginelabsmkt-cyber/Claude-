"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  definirStatusConteudoAction,
  excluirConteudoAction,
} from "@/lib/actions/contents";
import { statusAoConcluir, rotuloAvancar } from "@/lib/rules/contents";
import type { ContentStatus } from "@/types";

interface ContentActionsProps {
  id: string;
  status: ContentStatus;
  /** Redireciona após excluir; sem isto, apenas atualiza a lista. */
  redirecionarAoExcluir?: string;
  /** Tamanho compacto (para cards). */
  compacto?: boolean;
}

/**
 * Ações de um conteúdo: um botão PRINCIPAL contextual (avança o pipeline
 * conforme o status) e um menu ⋮ com as ações secundárias (editar, excluir).
 * Evita que várias ações concorram visualmente.
 */
export function ContentActions({
  id,
  status,
  redirecionarAoExcluir,
  compacto,
}: ContentActionsProps) {
  const router = useRouter();
  const [menuAberto, setMenuAberto] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [processando, iniciar] = useTransition();

  const proximo = statusAoConcluir(status);
  const rotulo = rotuloAvancar(status);

  function avancar() {
    if (!proximo) return;
    iniciar(async () => {
      await definirStatusConteudoAction(id, proximo);
      router.refresh();
    });
  }

  function excluir() {
    iniciar(async () => {
      await excluirConteudoAction(id);
      setConfirmar(false);
      if (redirecionarAoExcluir) router.push(redirecionarAoExcluir);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      {rotulo && proximo ? (
        <button
          type="button"
          onClick={avancar}
          disabled={processando}
          className={`rounded-md bg-brand-600 font-semibold text-white hover:bg-brand-700 disabled:opacity-60 ${
            compacto ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"
          }`}
        >
          {rotulo}
        </button>
      ) : null}

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuAberto((v) => !v)}
          onBlur={() => setTimeout(() => setMenuAberto(false), 150)}
          aria-label="Mais ações"
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-600 hover:bg-gray-50"
        >
          ⋮
        </button>
        {menuAberto ? (
          <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            <Link
              href={`/conteudos/${id}`}
              className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Abrir
            </Link>
            <Link
              href={`/conteudos/${id}/editar`}
              className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Editar
            </Link>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setMenuAberto(false);
                setConfirmar(true);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              Excluir
            </button>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        aberto={confirmar}
        titulo="Excluir conteúdo?"
        descricao="Esta ação não pode ser desfeita. O histórico e os comentários também serão apagados."
        textoConfirmar="Excluir"
        varianteConfirmar="perigo"
        carregando={processando}
        aoConfirmar={excluir}
        aoCancelar={() => setConfirmar(false)}
      />
    </div>
  );
}
