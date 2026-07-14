import Link from "next/link";
import { cn } from "@/lib/utils";

export interface DiaCalendario {
  iso: string;
  dia: number;
  noMes: boolean;
  hoje: boolean;
  quantidade: number;
}

interface MonthCalendarProps {
  titulo: string;
  semanas: DiaCalendario[][];
  hrefAnterior: string;
  hrefProximo: string;
  /** Constrói o link ao clicar num dia. */
  hrefDia: (iso: string) => string;
  diaSelecionado?: string;
}

const NOMES_DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/** Calendário mensal simples com quantidade de postagens por dia. */
export function MonthCalendar({
  titulo,
  semanas,
  hrefAnterior,
  hrefProximo,
  hrefDia,
  diaSelecionado,
}: MonthCalendarProps) {
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
              <Link
                key={d.iso}
                href={hrefDia(d.iso)}
                className={cn(
                  "flex min-h-[64px] flex-col rounded-lg border p-1.5 text-left transition-colors",
                  d.noMes ? "bg-white" : "bg-gray-50 text-gray-500",
                  d.iso === diaSelecionado
                    ? "border-brand-500 ring-1 ring-brand-500"
                    : "border-gray-200 hover:border-brand-300",
                )}
              >
                <span
                  className={cn(
                    "text-xs font-semibold",
                    d.hoje ? "text-brand-700" : "",
                  )}
                >
                  {d.dia}
                </span>
                {d.quantidade > 0 ? (
                  <span className="mt-auto inline-flex w-fit items-center rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
                    {d.quantidade}{" "}
                    {d.quantidade === 1 ? "post" : "posts"}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
