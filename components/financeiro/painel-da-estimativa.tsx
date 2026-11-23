"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  calcularEstimativa,
  clienteImaginado,
  type LinhaDaEstimativa,
} from "@/lib/financeiro/estimativa";
import { paraNumero } from "@/lib/financeiro/valores";
import { formatarMoeda, formatarPercentual } from "@/lib/utils";

/**
 * A estimativa de faturamento.
 *
 * A Fran: "se a gente pegar mais tantos clientes, quanto que fica o
 * nosso faturamento mensal (...) vai ter todos os nossos clientes,
 * mais os clientes que a gente vai adicionar. Tipo a mesma coisa que
 * tá lá no mensal, só que aí a gente faz a estimativa."
 *
 * Então é a lista do mês, com duas liberdades que o mês não tem:
 * dá para DESMARCAR um cliente (e ver quanto pesa perder ele) e dá
 * para INVENTAR cliente que ainda não existe.
 *
 * Nada aqui toca o banco. É rascunho — responde "e se", não registra
 * o que aconteceu. Por isso o que ela inventa fica guardado no
 * navegador DELA: some se ela trocar de computador, e a Vitória não
 * vê. Se um dia virar conversa das duas, aí vira tabela.
 */

const CHAVE = "favie-estimativa-v1";

interface Props {
  /** A carteira de hoje: nome e mensalidade de cada cliente ativo. */
  carteira: { id: string; nome: string; mensal: number }[];
  custoFixo: number;
  ticketMedio: number;
}

/** O que fica guardado no navegador: só o que ela mexeu. */
interface Rascunho {
  fora: string[];
  valores: Record<string, number>;
  imaginados: LinhaDaEstimativa[];
}

const VAZIO: Rascunho = { fora: [], valores: {}, imaginados: [] };

function emReais(v: number): string {
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function PainelDaEstimativa({ carteira, custoFixo, ticketMedio }: Props) {
  const [rascunho, setRascunho] = useState<Rascunho>(VAZIO);
  const [carregou, setCarregou] = useState(false);

  /* Lê o rascunho só depois de montar: no servidor não existe
     localStorage, e ler na primeira renderização faria o HTML do
     servidor e o do navegador discordarem. */
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE);
      if (salvo) setRascunho({ ...VAZIO, ...JSON.parse(salvo) });
    } catch {
      /* navegador anônimo, armazenamento bloqueado: segue sem rascunho. */
    }
    setCarregou(true);
  }, []);

  useEffect(() => {
    if (!carregou) return;
    try {
      localStorage.setItem(CHAVE, JSON.stringify(rascunho));
    } catch {
      /* sem onde guardar: a conta continua funcionando na tela. */
    }
  }, [rascunho, carregou]);

  const linhas: LinhaDaEstimativa[] = [
    ...carteira.map((c) => ({
      id: c.id,
      nome: c.nome,
      mensal: rascunho.valores[c.id] ?? c.mensal,
      dentro: !rascunho.fora.includes(c.id),
    })),
    ...rascunho.imaginados,
  ];

  const receitaDeHoje = carteira.reduce((t, c) => t + c.mensal, 0);
  const e = calcularEstimativa(linhas, custoFixo, receitaDeHoje);

  function alternar(id: string) {
    setRascunho((r) => ({
      ...r,
      fora: r.fora.includes(id)
        ? r.fora.filter((x) => x !== id)
        : [...r.fora, id],
      imaginados: r.imaginados.map((i) =>
        i.id === id ? { ...i, dentro: !i.dentro } : i,
      ),
    }));
  }

  function mudarValor(id: string, texto: string, imaginado: boolean) {
    const n = paraNumero(texto) ?? 0;
    setRascunho((r) =>
      imaginado
        ? {
            ...r,
            imaginados: r.imaginados.map((i) =>
              i.id === id ? { ...i, mensal: n } : i,
            ),
          }
        : { ...r, valores: { ...r.valores, [id]: n } },
    );
  }

  function mudarNome(id: string, nome: string) {
    setRascunho((r) => ({
      ...r,
      imaginados: r.imaginados.map((i) => (i.id === id ? { ...i, nome } : i)),
    }));
  }

  function adicionar() {
    setRascunho((r) => {
      /* O número sai do MAIOR já usado, não da quantidade: tirar o
         "Cliente novo 2" de três e adicionar outro geraria um
         segundo "novo-3", com id repetido — e dois campos de texto
         com a mesma chave brigam por quem manda. */
      const maior = r.imaginados.reduce((m, i) => {
        const n = Number(i.id.replace("novo-", ""));
        return Number.isFinite(n) && n > m ? n : m;
      }, 0);
      return {
        ...r,
        imaginados: [
          ...r.imaginados,
          clienteImaginado(ticketMedio || e.ticketMedio, maior + 1),
        ],
      };
    });
  }

  function tirar(id: string) {
    setRascunho((r) => ({
      ...r,
      imaginados: r.imaginados.filter((i) => i.id !== id),
    }));
  }

  const mexeu =
    rascunho.fora.length > 0 ||
    rascunho.imaginados.length > 0 ||
    Object.keys(rascunho.valores).length > 0;

  return (
    <>
      {/* A resposta primeiro, a lista depois: a pergunta dela é
          "quanto fica o faturamento", não "quais são os clientes". */}
      <div className="mb-5 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Faturamento estimado
            </p>
            <p className="text-2xl font-bold tabular-nums text-gray-900">
              {formatarMoeda(e.receita)}
            </p>
            <p className="text-xs text-gray-500">
              {e.quantos} {e.quantos === 1 ? "cliente" : "clientes"}
              {e.variacao ? (
                <>
                  {" · "}
                  <span
                    className={
                      e.variacao < 0 ? "text-alerta" : "text-green-700"
                    }
                  >
                    {e.variacao > 0 ? "+" : ""}
                    {formatarPercentual(e.variacao)}
                  </span>{" "}
                  contra hoje
                </>
              ) : null}
            </p>
          </div>

          <div className="border-t border-gray-100 pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Custo fixo
            </p>
            <p className="text-2xl font-bold tabular-nums text-gray-900">
              {formatarMoeda(e.custoFixo)}
            </p>
            <p className="text-xs text-gray-500">o que sai todo mês</p>
          </div>

          <div className="border-t border-gray-100 pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Sobra
            </p>
            <p
              className={
                "text-2xl font-bold tabular-nums " +
                (e.sobra < 0 ? "text-alerta" : "text-gray-900")
              }
            >
              {e.sobra < 0 ? "−" : ""}
              {formatarMoeda(Math.abs(e.sobra))}
            </p>
            <p className="text-xs text-gray-500">
              {e.sobra >= 0
                ? "o fixo está coberto"
                : e.faltamClientes
                  ? `faltam ${e.faltamClientes} ${e.faltamClientes === 1 ? "cliente" : "clientes"} no ticket médio`
                  : "sem cliente para tirar a média"}
            </p>
          </div>
        </div>

        {e.ticketMedio > 0 ? (
          <p className="mt-4 border-t border-gray-100 pt-3 text-sm text-gray-600">
            Ticket médio{" "}
            <strong className="font-semibold tabular-nums text-gray-900">
              {formatarMoeda(e.ticketMedio)}
            </strong>
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-2.5">
          <h2 className="text-sm font-bold text-gray-900">Clientes</h2>
          {mexeu ? (
            <button
              type="button"
              onClick={() => setRascunho(VAZIO)}
              className="text-xs font-medium text-gray-500 hover:text-gray-900 hover:underline"
            >
              Voltar à carteira de hoje
            </button>
          ) : null}
        </header>

        <ul className="divide-y divide-gray-100">
          {linhas.map((l) => (
            <li
              key={l.id}
              className={
                "flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 " +
                (l.dentro ? "" : "bg-gray-50")
              }
            >
              <input
                type="checkbox"
                checked={l.dentro}
                onChange={() => alternar(l.id)}
                aria-label={`Contar ${l.nome}`}
                className="h-4 w-4 shrink-0 accent-area"
              />

              {l.imaginado ? (
                <input
                  type="text"
                  value={l.nome}
                  onChange={(ev) => mudarNome(l.id, ev.target.value)}
                  aria-label="Nome do cliente novo"
                  className="min-w-0 flex-1 basis-40 rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-900"
                />
              ) : (
                <span
                  className={
                    "min-w-0 flex-1 basis-40 text-sm " +
                    (l.dentro ? "text-gray-900" : "text-gray-500 line-through")
                  }
                >
                  {l.nome}
                </span>
              )}

              <span className="ml-auto flex shrink-0 items-center gap-1.5">
                <span className="text-xs text-gray-500">R$</span>
                {/* A `key` com o valor dentro remonta o campo sempre
                    que o valor muda POR FORA — ao clicar em "Voltar à
                    carteira de hoje", por exemplo. Sem ela o campo é
                    descontrolado e guardava o que foi digitado mesmo
                    depois de a conta ter voltado ao original. De
                    quebra, o número se formata sozinho ao sair do
                    campo: digita "1810", vira "1.810,00". */}
                <input
                  key={`${l.id}-${l.mensal}`}
                  type="text"
                  inputMode="decimal"
                  defaultValue={emReais(l.mensal)}
                  onBlur={(ev) =>
                    mudarValor(l.id, ev.target.value, !!l.imaginado)
                  }
                  aria-label={`Mensalidade de ${l.nome}`}
                  className="w-28 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm tabular-nums text-gray-900"
                />
                {l.imaginado ? (
                  <button
                    type="button"
                    onClick={() => tirar(l.id)}
                    aria-label={`Tirar ${l.nome}`}
                    className="rounded px-1.5 py-0.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-alerta"
                  >
                    Tirar
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-4 py-2.5">
          <Button variante="secundaria" onClick={adicionar}>
            + Cliente novo
          </Button>
          <span className="text-lg font-bold tabular-nums text-gray-900">
            {formatarMoeda(e.receita)}
          </span>
        </footer>
      </div>
    </>
  );
}
