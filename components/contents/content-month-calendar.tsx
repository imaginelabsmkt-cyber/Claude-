import Link from "next/link";
import { cn } from "@/lib/utils";

export interface DiaConteudos {
  iso: string;
  dia: number;
  noMes: boolean;
  hoje: boolean;
  itens: { id: string; title: string; format: string | null }[];
}

interface ContentMonthCalendarProps {
  titulo: string;
  semanas: DiaConteudos[][];
  hrefAnterior: string;
  hrefProximo: string;
  cor?: string | null;
}

const NOMES_DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/**
 * Calendário mensal que mostra os CONTEÚDOS nos dias em que saem.
 * Cada conteúdo é um "chip" clicável. Navegação entre meses por links.
 */
export function ContentMonthCalendar({
  titulo,
  semanas,
  hrefAnterior,
  hrefProximo,
  cor,
}: ContentMonthCalendarProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={hrefAnterior}
          className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
        >
          ← Anterior
        </Link>
        <h2 className="text-base font-semibold capitalize text-gray-900">
          {titulo}
        </h2>
        <Link
          href={hrefProximo}
          className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
        >
          Próximo →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500">
            {NOMES_DIAS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="mt-1 space-y-1">
            {semanas.map((semana, i) => (
              <div key={i} className="grid grid-cols-7 gap-1">
                {semana.map((d) => (
                  <div
                    key={d.iso}
                    className={cn(
                      "flex min-h-[92px] flex-col rounded-lg border p-1",
                      d.noMes ? "bg-white" : "bg-gray-50",
                      d.hoje ? "border-brand-400" : "border-gray-200",
                    )}
                  >
                    <span
                      className={cn(
                        "mb-1 text-xs font-semibold",
                        d.noMes ? "text-gray-700" : "text-gray-400",
                        d.hoje ? "text-brand-700" : "",
                      )}
                    >
                      {d.dia}
                    </span>
                    <div className="flex flex-col gap-1">
                      {d.itens.map((it) => (
                        <Link
                          key={it.id}
                          href={`/conteudos/${it.id}`}
                          title={it.title}
                          className="block rounded px-1 py-0.5 text-left text-[11px] leading-tight text-white"
                          style={{ backgroundColor: cor ?? "#4f46e5" }}
                        >
                          <span className="block truncate">
                            {it.format ? `${it.format} · ` : ""}
                            {it.title}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
