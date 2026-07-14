"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  aberto: boolean;
  titulo: string;
  descricao?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  varianteConfirmar?: "primaria" | "perigo";
  carregando?: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}

/**
 * Diálogo de confirmação acessível e simples (overlay + card).
 * Fecha com ESC ou clique no overlay.
 */
export function ConfirmDialog({
  aberto,
  titulo,
  descricao,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  varianteConfirmar = "primaria",
  carregando = false,
  aoConfirmar,
  aoCancelar,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!aberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape" && !carregando) aoCancelar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto, carregando, aoCancelar]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={() => !carregando && aoCancelar()}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-gray-900">{titulo}</h2>
        {descricao ? (
          <p className="mt-2 text-sm text-gray-500">{descricao}</p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button
            variante="secundaria"
            onClick={aoCancelar}
            disabled={carregando}
          >
            {textoCancelar}
          </Button>
          <Button
            variante={varianteConfirmar}
            onClick={aoConfirmar}
            disabled={carregando}
          >
            {carregando ? "Aguarde..." : textoConfirmar}
          </Button>
        </div>
      </div>
    </div>
  );
}
