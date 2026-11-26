"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  calcularEstimativa,
  clienteImaginado,
  type LinhaDaEstimativa,
  type Origem,
} from "@/lib/financeiro/estimativa";
import { paraNumero } from "@/lib/financeiro/valores";
import { LEAD_TEMPERATURE_TONE } from "@/types";
import { formatarMoeda, formatarPercentual } from "@/lib/utils";

/**
 * A estimativa de faturamento.
 *
 * A Fran pediu: "se a gente pegar mais tantos clientes, quanto que
 * fica o nosso faturamento mensal". E, vendo a primeira versão:
 * "QUERO QUE SEJA DE ACORDO COM O QUE ESTAMOS PROSPECTANDO NO
 * COMERCIAL."
 *
 * Então a tela tem três blocos, e só o primeiro já existia:
 *
 *   CLIENTES DE HOJE   a carteira, marcada. Desmarcar simula perder.
 *   EM PROSPECÇÃO      o funil de verdade, DESMARCADO. Marcar quer
 *                      dizer "supondo que esta feche".
 *   À MÃO              para o "e se a gente pegar mais dois, além
 *                      do funil". É a exceção, não a regra.
 *
 * As oportunidades vêm com etapa e temperatura do lado, porque marcar
 * um "Novo lead" frio e marcar uma "Negociação" quente não valem a
 * mesma coisa, e a tela não deve fingir que valem.
 *
 * Nada aqui toca o banco. É rascunho, responde "e se", não registra
 * o que aconteceu. Fica guardado no navegador DELA.
 */

const CHAVE = "favie-estimativa-v2";

export interface OportunidadeNaEstimativa {
  id: string;
  nome: string;
  mensal: number;
  etapa: string;
  temperatura: string | null;
}

interface Props {
  /** A carteira de hoje: nome e mensalidade de cada cliente ativo. */
  carteira: { id: string; nome: string; mensal: number }[];
  /** O funil comercial: o que está em jogo agora. */
  prospeccao: OportunidadeNaEstimativa[];
  custoFixo: number;
  ticketMedio: number;
}

/** O que fica guardado no navegador: só o que ela mexeu. */
interface Rascunho {
  /** Clientes de hoje que ela desmarcou. */
  fora: string[];
  /** Oportunidades do funil que ela marcou. */
  dentro: string[];
  valores: Record<string, number>;
  imaginados: LinhaDaEstimativa[];
}

const VAZIO: Rascunho = { fora: [], dentro: [], valores: {}, imaginados: [] };

function emReais(v: number): string {
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function PainelDaEstimativa({
  carteira,
  prospeccao,
  custoFixo,
  ticketMedio,
}: Props) {
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

  const deHoje: LinhaDaEstimativa[] = carteira.map((c) => ({
    id: c.id,
    nome: c.nome,
    mensal: rascunho.valores[c.id] ?? c.mensal,
    dentro: !rascunho.fora.includes(c.id),
    origem: "carteira",
  }));

  const emJogo: LinhaDaEstimativa[] = prospeccao.map((o) => ({
    id: o.id,
    nome: o.nome,
    mensal: rascunho.valores[o.id] ?? o.mensal,
    /* Oportunidade nasce DESMARCADA: ela ainda não é receita, e uma
       tela que já conta o funil inteiro mente para quem olha rápido. */
    dentro: rascunho.dentro.includes(o.id),
    origem: "prospeccao",
    etapa: o.etapa,
    temperatura: o.temperatura,
  }));

  const linhas = [...deHoje, ...emJogo, ...rascunho.imaginados];
  const receitaDeHoje = carteira.reduce((t, c) => t + c.mensal, 0);
  const e = calcularEstimativa(linhas, custoFixo, receitaDeHoje);

  function alternar(id: string, origem: Origem) {
    setRascunho((r) => {
      if (origem === "carteira") {
        return {
          ...r,
          fora: r.fora.includes(id)
            ? r.fora.filter((x) => x !== id)
            : [...r.fora, id],
        };
      }
      if (origem === "prospeccao") {
        return {
          ...r,
          dentro: r.dentro.includes(id)
            ? r.dentro.filter((x) => x !== id)
            : [...r.dentro, id],
        };
      }
      return {
        ...r,
        imaginados: r.imaginados.map((i) =>
          i.id === id ? { ...i, dentro: !i.dentro } : i,
        ),
      };
    });
  }

  function mudarValor(id: string, texto: string, origem: Origem) {
    const n = paraNumero(texto) ?? 0;
    setRascunho((r) =>
      origem === "imaginado"
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
         segundo "novo-3", com id repetido. */
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

  function marcarTodoOFunil() {
    setRascunho((r) => ({ ...r, dentro: prospeccao.map((o) => o.id) }));
  }

  const mexeu =
    rascunho.fora.length > 0 ||
    rascunho.dentro.length > 0 ||
    rascunho.imaginados.length > 0 ||
    Object.keys(rascunho.valores).length > 0;

  const todoOFunil = prospeccao.reduce((t, o) => t + o.mensal, 0);

  function Linha({ l }: { l: LinhaDaEstimativa }) {
    return (
      <li
        className={
          "flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 " +
          (l.dentro ? "" : "bg-gray-50")
        }
      >
        <input
          type="checkbox"
          checked={l.dentro}
          onChange={() => alternar(l.id, l.origem)}
          aria-label={`Contar ${l.nome}`}
          className="h-4 w-4 shrink-0 accent-area"
        />

        {l.origem === "imaginado" ? (
          <input
            type="text"
            value={l.nome}
            onChange={(ev) => mudarNome(l.id, ev.target.value)}
            aria-label="Nome do cliente"
            className="min-w-0 flex-1 basis-40 rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-900"
          />
        ) : (
          <span
            className={
              "min-w-0 flex-1 basis-40 text-sm " +
              (l.dentro
                ? "text-gray-900"
                : l.origem === "carteira"
                  ? "text-gray-500 line-through"
                  : "text-gray-500")
            }
          >
            {l.nome}
          </span>
        )}

        <span className="ml-auto flex shrink-0 items-center gap-2">
          {/* Etapa e temperatura: marcar um "Novo lead" frio não vale
              o mesmo que marcar uma "Negociação" quente, e a tela não
              deve fingir que vale. */}
          {l.etapa ? (
            <span className="text-xs text-gray-500">{l.etapa}</span>
          ) : null}
          {l.temperatura ? (
            <Badge
              tom={
                LEAD_TEMPERATURE_TONE[
                  l.temperatura as keyof typeof LEAD_TEMPERATURE_TONE
                ]
              }
            >
              {l.temperatura}
            </Badge>
          ) : null}
          <span className="text-xs text-gray-500">R$</span>
          {/* A `key` com o valor dentro remonta o campo quando o valor
              muda POR FORA (ao limpar o rascunho, por exemplo). De
              quebra o número se formata sozinho ao sair do campo. */}
          <input
            key={`${l.id}-${l.mensal}`}
            type="text"
            inputMode="decimal"
            defaultValue={emReais(l.mensal)}
            onBlur={(ev) => mudarValor(l.id, ev.target.value, l.origem)}
            aria-label={`Mensalidade de ${l.nome}`}
            className="w-28 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm tabular-nums text-gray-900"
          />
          {l.origem === "imaginado" ? (
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
    );
  }

  function Bloco({
    titulo,
    sub,
    acao,
    linhas: ls,
  }: {
    titulo: string;
    sub?: string;
    acao?: React.ReactNode;
    linhas: LinhaDaEstimativa[];
  }) {
    if (ls.length === 0) return null;
    return (
      <div className="mb-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-2.5">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-gray-900">{titulo}</h2>
            {sub ? <p className="text-xs text-gray-500">{sub}</p> : null}
          </div>
          {acao}
        </header>
        <ul className="divide-y divide-gray-100">
          {ls.map((l) => (
            <Linha key={l.id} l={l} />
          ))}
        </ul>
      </div>
    );
  }

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
                    className={e.variacao < 0 ? "text-alerta" : "text-green-700"}
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

        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-gray-100 pt-3 text-sm text-gray-600">
          {e.quantasEmProspeccao > 0 ? (
            <span>
              Do comercial{" "}
              <strong className="font-semibold tabular-nums text-gray-900">
                {formatarMoeda(e.dePropeccao)}
              </strong>{" "}
              em {e.quantasEmProspeccao}{" "}
              {e.quantasEmProspeccao === 1 ? "oportunidade" : "oportunidades"}
            </span>
          ) : null}
          {e.ticketMedio > 0 ? (
            <span>
              Ticket médio{" "}
              <strong className="font-semibold tabular-nums text-gray-900">
                {formatarMoeda(e.ticketMedio)}
              </strong>
            </span>
          ) : null}
          {mexeu ? (
            <button
              type="button"
              onClick={() => setRascunho(VAZIO)}
              className="ml-auto font-medium text-gray-500 hover:text-gray-900 hover:underline"
            >
              Voltar à carteira de hoje
            </button>
          ) : null}
        </p>
      </div>

      <Bloco
        titulo="Clientes de hoje"
        sub="A carteira como ela está. Desmarcar simula perder o cliente."
        linhas={deHoje}
      />

      <Bloco
        titulo="Em prospecção"
        sub="O funil do comercial. Marcar quer dizer: supondo que esta feche."
        acao={
          prospeccao.length > 0 ? (
            <button
              type="button"
              onClick={marcarTodoOFunil}
              className="shrink-0 text-xs font-medium text-gray-600 hover:text-gray-900 hover:underline"
            >
              Marcar tudo · {formatarMoeda(todoOFunil)}
            </button>
          ) : undefined
        }
        linhas={emJogo}
      />

      <Bloco titulo="À mão" linhas={rascunho.imaginados} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <Button variante="secundaria" onClick={adicionar}>
          + Linha à mão
        </Button>
        <span className="text-lg font-bold tabular-nums text-gray-900">
          {formatarMoeda(e.receita)}
        </span>
      </div>
    </>
  );
}
