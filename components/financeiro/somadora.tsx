"use client";

import { useState } from "react";
import { somar } from "@/lib/financeiro/somadora";
import { formatarMoeda } from "@/lib/utils";

/**
 * A soma de guardanapo.
 *
 * A Fran: "queria que desse pra fazer uma calculadora bem básica.
 * Preciso somar o que eu preciso mandar pra Vitória: o pró-labore
 * dela, a mentoria e o iCloud dela. Quanto dá no total?".
 *
 * Não é uma calculadora com teclas — é uma folha onde se joga os
 * números, um por linha, e o total aparece embaixo. É o que ela faz
 * hoje no papel, do lado do computador.
 *
 * Aceita colar direto do sistema: "R$ 6.500,00" entra igual. E o que
 * não for número aparece como ignorado, em vez de somar errado
 * calado.
 */
export function Somadora() {
  const [aberta, setAberta] = useState(false);
  const [texto, setTexto] = useState("");
  const r = somar(texto);

  if (!aberta) {
    return (
      <button
        type="button"
        onClick={() => setAberta(true)}
        className="self-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:underline"
      >
        Somar
      </button>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-bold text-gray-900">Somar</span>
        <button
          type="button"
          onClick={() => {
            setAberta(false);
            setTexto("");
          }}
          className="text-xs font-medium text-gray-500 hover:text-gray-900"
        >
          Fechar
        </button>
      </div>

      <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <textarea
          autoFocus
          rows={4}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={"6500\n2166,70\n66,90"}
          aria-label="Os valores a somar, um por linha"
          className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-gray-900 outline-none focus:border-brand-600"
        />

        <div className="sm:w-48 sm:text-right">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Total
          </p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-gray-900">
            {formatarMoeda(r.total)}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {r.parcelas.length === 0
              ? "um valor por linha"
              : `${r.parcelas.length} ${r.parcelas.length === 1 ? "valor" : "valores"}`}
          </p>
          {texto ? (
            <button
              type="button"
              onClick={() => setTexto("")}
              className="mt-1 text-xs font-medium text-gray-500 hover:text-gray-900 hover:underline"
            >
              Limpar
            </button>
          ) : null}
        </div>
      </div>

      {r.ignorados.length > 0 ? (
        <p className="mt-2 text-xs text-alerta">
          Não entendi: {r.ignorados.join(", ")}
        </p>
      ) : null}
    </div>
  );
}
