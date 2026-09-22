"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buscarAction } from "@/lib/actions/busca";
import { area } from "@/lib/interno/areas";
import { cn } from "@/lib/utils";
import type { ResultadoBusca } from "@/lib/data/busca";

/**
 * Busca global do sistema interno (⌘K / Ctrl+K).
 *
 * Acha cliente, lançamento, oportunidade, pessoa, obrigação e documento
 * de qualquer tela. Cada resultado carrega a cor da área de onde veio —
 * o mesmo código de cor do resto do sistema.
 *
 * A busca roda no servidor: o navegador nunca recebe o que o RLS não
 * deixaria passar.
 */
export function BuscaComando() {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [selecionado, setSelecionado] = useState(0);
  const [buscando, iniciar] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  // Guarda a última busca disparada: respostas atrasadas de buscas
  // antigas não podem sobrescrever o resultado da busca atual.
  const ultimaRef = useRef("");

  // Atalho de teclado: ⌘K no Mac, Ctrl+K no resto.
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAberta((v) => !v);
      }
      if (e.key === "Escape") setAberta(false);
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, []);

  useEffect(() => {
    if (aberta) {
      // O foco só existe depois do elemento entrar na tela.
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
    setTermo("");
    setResultados([]);
    setSelecionado(0);
  }, [aberta]);

  // Busca com folga de 200 ms, para não disparar a cada tecla.
  useEffect(() => {
    if (termo.trim().length < 2) {
      setResultados([]);
      return;
    }
    const alvo = termo;
    ultimaRef.current = alvo;

    const t = setTimeout(() => {
      iniciar(async () => {
        const r = await buscarAction(alvo);
        if (ultimaRef.current !== alvo) return;
        setResultados(r);
        setSelecionado(0);
      });
    }, 200);

    return () => clearTimeout(t);
  }, [termo]);

  const irPara = useCallback(
    (r: ResultadoBusca) => {
      setAberta(false);
      router.push(r.href);
    },
    [router],
  );

  function aoTeclarNaLista(e: React.KeyboardEvent) {
    if (resultados.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelecionado((i) => (i + 1) % resultados.length);
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelecionado((i) => (i - 1 + resultados.length) % resultados.length);
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const escolhido = resultados[selecionado];
      if (escolhido) irPara(escolhido);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
        </svg>
        <span className="hidden sm:inline">Buscar</span>
        <kbd className="hidden rounded border border-gray-300 bg-white px-1 text-[10px] text-gray-400 sm:inline">
          ⌘K
        </kbd>
      </button>

      {aberta ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh]"
          onClick={() => setAberta(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Buscar no sistema interno"
          >
            <div className="flex items-center gap-2.5 border-b border-gray-200 px-4">
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                id="busca-global"
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                onKeyDown={aoTeclarNaLista}
                placeholder="Cliente, lançamento, oportunidade, pessoa…"
                className="w-full bg-transparent py-3.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                autoComplete="off"
              />
              {buscando ? (
                <span className="shrink-0 text-xs text-gray-400">buscando…</span>
              ) : null}
            </div>

            <div className="max-h-[52vh] overflow-y-auto">
              {termo.trim().length < 2 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400">
                  Digite ao menos duas letras.
                </p>
              ) : resultados.length === 0 && !buscando ? (
                <p className="px-4 py-8 text-center text-sm text-gray-500">
                  Nada encontrado para <strong>{termo}</strong>.
                </p>
              ) : (
                <ul>
                  {resultados.map((r, i) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        data-area={r.origem}
                        onClick={() => irPara(r)}
                        onMouseEnter={() => setSelecionado(i)}
                        className={cn(
                          "flex w-full items-center gap-3 border-l-4 border-area px-4 py-2.5 text-left transition-colors",
                          i === selecionado ? "bg-area-soft" : "bg-white",
                        )}
                      >
                        <span className="w-24 shrink-0 text-[10px] font-bold uppercase tracking-wider text-area">
                          {r.tipo}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-gray-900">
                            {r.titulo}
                          </span>
                          <span className="block truncate text-xs text-gray-500">
                            {r.detalhe}
                          </span>
                        </span>
                        <span className="shrink-0 text-[10px] uppercase tracking-wider text-gray-400">
                          {area(r.origem).label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center gap-3 border-t border-gray-200 bg-gray-50 px-4 py-2 text-[11px] text-gray-400">
              <span>↑↓ navegar</span>
              <span>↵ abrir</span>
              <span>esc fechar</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
