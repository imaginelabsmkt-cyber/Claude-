"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icone } from "@/components/interno/icone";
import { area, areaDaRota } from "@/lib/interno/areas";

interface AreaHeaderProps {
  /**
   * Título da tela. Omitido, usa o nome da ÁREA.
   *
   * Numa área com abas, o título era sempre o nome da aba ativa, que
   * já está escrita e sublinhada logo embaixo. "Clientes" aparecia
   * duas vezes a dois centímetros de distância. Então a tela com abas
   * não passa título: o H1 é a área, a aba diz em que parte dela você
   * está, e a linha de apoio diz o que aquela parte responde.
   *
   * Tela sem aba (um formulário, a ficha de uma oportunidade) continua
   * passando o próprio título.
   */
  titulo?: string;
  /** Linha de apoio: o período, ou o que a tela responde. */
  contexto?: string;
  /** Canto direito do cabeçalho — normalmente o período ou uma ação. */
  acao?: ReactNode;
  /** Ícone da tela. Omitido, usa o da área aberta. */
  icone?: string;
}

/**
 * Cabeçalho padrão de uma tela do interno.
 *
 * Mesmo formato do sistema de demandas da Favie: chip arredondado com o
 * ícone, título grande, linha de apoio embaixo. A diferença é que o chip
 * não tem cor fixa — ele usa a cor da ÁREA aberta (`bg-area-soft` /
 * `text-area`), então o mesmo componente se tinge de vinho no Comercial,
 * verde no Financeiro e rosa em Meus gastos.
 *
 * Descobre a área pela rota em vez de receber por prop: são 18 telas, e
 * cada uma ter que lembrar de passar o próprio ícone é exatamente o tipo
 * de detalhe que fica desatualizado.
 */
export function AreaHeader({ titulo, contexto, acao, icone }: AreaHeaderProps) {
  const pathname = usePathname();
  const atual = area(areaDaRota(pathname));

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-area-soft text-area">
          <Icone nome={icone ?? atual.icone} className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">
            {titulo ?? atual.label}
          </h1>
          {contexto ? (
            <p className="mt-0.5 text-sm text-gray-500">{contexto}</p>
          ) : null}
        </div>
      </div>
      {acao ? <div className="shrink-0">{acao}</div> : null}
    </div>
  );
}
