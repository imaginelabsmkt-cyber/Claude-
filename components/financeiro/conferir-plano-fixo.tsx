"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { avisoDoItem } from "@/lib/financeiro/plano-fixo";
import { paraNumero } from "@/lib/financeiro/valores";
import type { ItemConferidoNaTela } from "@/lib/actions/financeiro";
import { rotuloMes } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";

/**
 * A conferência antes de gerar o mês.
 *
 * Do documento da Favie: "antes de criar os lançamentos, mostrar a
 * lista para vocês conferirem. Assim ninguém precisa lembrar de nada
 * à mão e nada fica duplicado."
 *
 * Três decisões que o texto pede e que valem explicar:
 *
 *   O VALOR É EDITÁVEL AQUI. Ferramenta muda de preço com o dólar, e
 *   corrigir depois, um por um, eram quatro cliques por item.
 *
 *   O QUE JÁ EXISTE VEM DESMARCADO, NÃO SOME. Sumir seria decidir
 *   pela pessoa. Ela vê que está lá, vê por quê, e marca se
 *   discordar.
 *
 *   SÓ O MARCADO É CRIADO. O botão diz quantos, para não haver
 *   surpresa do outro lado do clique.
 */

interface Props {
  mes: string;
  itens: ItemConferidoNaTela[];
  processando: boolean;
  aoGerar: (escolha: { id: string; amount: number }[]) => void;
  aoCancelar: () => void;
}

export function ConferirPlanoFixo({
  mes,
  itens,
  processando,
  aoGerar,
  aoCancelar,
}: Props) {
  const [marcados, setMarcados] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(itens.map((i) => [i.id, i.marcado])),
  );
  /* O valor aparece como ela escreve na planilha — "6.500,00", não
     "6500". Entra por `paraNumero`, que já aceita "1.700,50",
     "1700,5", "R$ 250" e "250.75". */
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      itens.map((i) => [
        i.id,
        i.amount.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      ]),
    ),
  );

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape" && !processando) aoCancelar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [processando, aoCancelar]);

  const escolha = itens
    .filter((i) => marcados[i.id])
    .map((i) => ({ id: i.id, amount: paraNumero(valores[i.id]) ?? i.amount }));

  const total = escolha.reduce((t, e) => {
    const item = itens.find((i) => i.id === e.id)!;
    return t + (item.kind === "Despesa" ? -e.amount : e.amount);
  }, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8"
      onClick={() => !processando && aoCancelar()}
      role="dialog"
      aria-modal="true"
      aria-label="Conferir o plano fixo"
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            Gerar o plano fixo de {rotuloMes(mes)}
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Confira os valores e desmarque o que não quiser lançar.
          </p>
        </header>

        <ul className="max-h-[55vh] divide-y divide-gray-100 overflow-y-auto">
          {itens.map((i) => {
            const marcado = marcados[i.id];
            return (
              <li
                key={i.id}
                className={
                  "flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 " +
                  (marcado ? "" : "bg-gray-50")
                }
              >
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={(e) =>
                    setMarcados((m) => ({ ...m, [i.id]: e.target.checked }))
                  }
                  aria-label={`Lançar ${i.description}`}
                  className="h-4 w-4 shrink-0 accent-area"
                />

                <span className="min-w-0 flex-1 basis-40">
                  <span
                    className={
                      "block text-sm " +
                      (marcado ? "text-gray-900" : "text-gray-500")
                    }
                  >
                    {i.description}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {i.categoria ?? "Sem categoria"}
                    {i.jaLancado ? (
                      <>
                        {" · "}
                        <strong className="font-semibold text-alerta">
                          {avisoDoItem(i.jaLancado)}
                        </strong>
                      </>
                    ) : null}
                  </span>
                </span>

                <span className="ml-auto flex shrink-0 items-center gap-1.5">
                  <span className="text-xs text-gray-500">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={valores[i.id]}
                    onChange={(e) =>
                      setValores((v) => ({ ...v, [i.id]: e.target.value }))
                    }
                    aria-label={`Valor de ${i.description}`}
                    className="w-28 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm tabular-nums text-gray-900"
                  />
                </span>
              </li>
            );
          })}
        </ul>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-5 py-3">
          <p className="text-sm text-gray-600">
            {escolha.length === 0 ? (
              "Nada marcado."
            ) : (
              <>
                {escolha.length}{" "}
                {escolha.length === 1 ? "lançamento" : "lançamentos"} ·{" "}
                <strong className="font-semibold tabular-nums text-gray-900">
                  {formatarMoeda(Math.abs(total))}
                </strong>{" "}
                {total < 0 ? "a pagar" : "a receber"}
              </>
            )}
          </p>
          <div className="flex gap-2">
            <Button
              variante="secundaria"
              onClick={aoCancelar}
              disabled={processando}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => aoGerar(escolha)}
              disabled={processando || escolha.length === 0}
            >
              {processando
                ? "Gerando..."
                : escolha.length === 1
                  ? "Gerar 1 lançamento"
                  : `Gerar ${escolha.length} lançamentos`}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
