"use client";

import { useState, type ReactNode } from "react";

type Aba = "conteudos" | "arquivos";

/**
 * Abas da ficha do cliente: alterna entre a planilha de conteúdos e a central
 * de arquivos. Os dois painéis são renderizados no servidor e só trocam de
 * visibilidade (sem recarregar), então a planilha não perde o estado.
 */
export function ClientSectionTabs({
  conteudos,
  arquivos,
  totalArquivos,
}: {
  conteudos: ReactNode;
  arquivos: ReactNode;
  totalArquivos: number;
}) {
  const [aba, setAba] = useState<Aba>("conteudos");

  const Botao = ({ id, children }: { id: Aba; children: ReactNode }) => {
    const ativo = aba === id;
    return (
      <button
        type="button"
        onClick={() => setAba(id)}
        className={
          "-mb-px flex items-center gap-1.5 border-b-2 px-1 pb-2 text-sm font-semibold transition-colors " +
          (ativo
            ? "border-brand-600 text-brand-700"
            : "border-transparent text-gray-500 hover:text-gray-800")
        }
      >
        {children}
      </button>
    );
  };

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center gap-5 border-b border-gray-200">
        <Botao id="conteudos">📋 Conteúdos</Botao>
        <Botao id="arquivos">
          📁 Arquivos
          {totalArquivos > 0 ? (
            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] font-bold text-gray-600">
              {totalArquivos}
            </span>
          ) : null}
        </Botao>
      </div>
      <div className={aba === "conteudos" ? "" : "hidden"}>{conteudos}</div>
      <div className={aba === "arquivos" ? "" : "hidden"}>{arquivos}</div>
    </div>
  );
}
