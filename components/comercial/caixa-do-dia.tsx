import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Secao } from "@/components/interno/secao";
import { LEAD_TEMPERATURE_TONE } from "@/types";
import { formatarMoeda } from "@/lib/utils";

/**
 * Uma caixa da tela "Hoje".
 *
 * Vive num componente só porque a prévia visual desenha ESTE
 * arquivo. Antes a prévia tinha uma cópia do markup da página, e
 * cópia envelhece: já aconteceu de eu mostrar à Fran uma tela que
 * não existia mais.
 */

export interface LinhaDoDia {
  id: string;
  name: string;
  /** O que escrever no meio: a etapa, ou o motivo de não ter fechado. */
  detalhe: string | null;
  /** "atrasado 3 dias", "hoje", "em 2 dias". */
  quando: string;
  atrasado?: boolean;
  valor: number;
  temperatura: string | null;
}

export function CaixaDoDia({
  titulo,
  sub,
  linhas,
  vazio,
}: {
  titulo: string;
  sub: string;
  linhas: LinhaDoDia[];
  vazio: string;
}) {
  return (
    <Secao titulo={`${titulo}${linhas.length ? ` (${linhas.length})` : ""}`}>
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <p className="border-b border-gray-100 px-4 py-2 text-xs text-gray-500">
          {sub}
        </p>
        {linhas.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-500">{vazio}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {linhas.map((l) => (
              <li
                key={l.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5"
              >
                <Link
                  href={`/interno/comercial/${l.id}`}
                  className="min-w-0 flex-1 basis-40 text-sm font-semibold text-gray-900 hover:underline"
                >
                  {l.name}
                </Link>
                {/* Temperatura, etapa, prazo e valor descem juntos
                    para a segunda linha no celular, em vez de
                    espremer o nome em três linhas. */}
                <span className="ml-auto flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
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
                  {l.detalhe ? (
                    <span className="shrink-0 text-xs text-gray-500">
                      {l.detalhe}
                    </span>
                  ) : null}
                  <span
                    className={
                      "shrink-0 text-right text-xs font-semibold tabular-nums " +
                      (l.atrasado ? "text-alerta" : "text-gray-600")
                    }
                  >
                    {l.quando}
                  </span>
                  <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-gray-900">
                    {formatarMoeda(l.valor)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Secao>
  );
}
