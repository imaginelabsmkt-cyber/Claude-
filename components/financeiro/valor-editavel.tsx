"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { definirValorLancamentoAction } from "@/lib/actions/financeiro";
import { paraCampo } from "@/lib/financeiro/valores";
import { toast } from "@/lib/ui/toast";
import { formatarMoeda } from "@/lib/utils";

interface ValorEditavelProps {
  id: string;
  valor: number;
  /** Para o leitor de tela saber de qual linha é o valor. */
  descricao: string;
}

/**
 * O VALOR, editável na própria linha.
 *
 * As ferramentas são cobradas em dólar e mudam de preço todo mês: o
 * Claude foi R$ 612,77 em outubro, R$ 572,00 na fatura e R$ 454,10 em
 * novembro. Corrigir cada uma abrindo o formulário inteiro eram
 * quatro cliques por item e oito itens por mês.
 *
 * Clica, digita, Enter. Esc desiste. Sair do campo também salva,
 * porque quem está descendo a lista com a fatura do lado vai do
 * Claude para o ChatGPT direto, sem passar pelo Enter.
 *
 * Não fica com cara de campo o tempo todo: vinte caixas de texto numa
 * tela é mais ruído do que a tela aguenta. Só o tracejado embaixo diz
 * "dá para mexer aqui".
 */
export function ValorEditavel({ id, valor, descricao }: ValorEditavelProps) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(paraCampo(valor));
  const [processando, iniciar] = useTransition();
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editando) {
      campo.current?.focus();
      campo.current?.select();
    }
  }, [editando]);

  function salvar() {
    if (!editando || processando) return;
    const limpo = texto.trim();
    if (limpo === "" || limpo === paraCampo(valor)) {
      setEditando(false);
      setTexto(paraCampo(valor));
      return;
    }
    iniciar(async () => {
      const r = await definirValorLancamentoAction(id, limpo);
      if (!r.ok) {
        toast.erro(r.error ?? "Não foi possível mudar o valor.");
        setTexto(paraCampo(valor));
        setEditando(false);
        return;
      }
      setEditando(false);
      router.refresh();
    });
  }

  function desistir() {
    setTexto(paraCampo(valor));
    setEditando(false);
  }

  if (editando) {
    return (
      <input
        ref={campo}
        inputMode="decimal"
        aria-label={`Valor de ${descricao}`}
        value={texto}
        disabled={processando}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={salvar}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            salvar();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            desistir();
          }
        }}
        className="w-24 rounded border border-brand-400 bg-white px-1.5 py-0.5 text-right text-sm font-semibold tabular-nums text-gray-900 outline-none focus:border-brand-600"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditando(true)}
      title={`Mudar o valor de ${descricao}`}
      className="rounded px-1 text-sm font-semibold tabular-nums text-gray-900 underline decoration-gray-300 decoration-dashed underline-offset-4 hover:bg-gray-100 hover:decoration-gray-500"
    >
      {formatarMoeda(valor)}
    </button>
  );
}
