"use client";

import { useEffect } from "react";

/**
 * Barreira de erro de rota: em vez de uma tela branca com "client-side
 * exception", mostra uma mensagem clara e um botão de tentar de novo. Vale pra
 * qualquer página; o layout do app continua em volta.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Ajuda a achar a causa no log do navegador/servidor.
    console.error("Erro na página:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md">
        <p className="text-lg font-bold text-brand-800">
          Algo deu errado nesta tela
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Tente de novo. Se continuar, recarregue a página. Se o erro persistir,
          avise que a gente verifica.
        </p>
        {error.digest ? (
          <p className="mt-2 text-[11px] text-gray-400">
            Código do erro: {error.digest}
          </p>
        ) : null}
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Tentar de novo
          </button>
          <a
            href="/dashboard"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Ir para o início
          </a>
        </div>
      </div>
    </div>
  );
}
