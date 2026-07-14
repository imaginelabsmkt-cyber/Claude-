"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";
import { FORMAT_OPTIONS, STATUS_OPTIONS, WEEK_OPTIONS } from "@/types";

interface PanelFiltersProps {
  meses: string[];
}

/**
 * Filtros do painel operacional do cliente: mês, status, formato e semana.
 * Estado na URL. O mês também controla os cards e as seções da página.
 */
export function PanelFilters({ meses }: PanelFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function aplicar(chave: string, valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (valor) params.set(chave, valor);
    else params.delete(chave);
    router.push(`${pathname}?${params.toString()}`);
  }

  const valor = (chave: string) => searchParams.get(chave) ?? "";

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Select
        aria-label="Mês"
        value={valor("reference_month")}
        onChange={(e) => aplicar("reference_month", e.target.value)}
      >
        <option value="">Mês: todos</option>
        {meses.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Status"
        value={valor("status")}
        onChange={(e) => aplicar("status", e.target.value)}
      >
        <option value="">Status: todos</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Formato"
        value={valor("format")}
        onChange={(e) => aplicar("format", e.target.value)}
      >
        <option value="">Formato: todos</option>
        {FORMAT_OPTIONS.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Semana"
        value={valor("planned_week")}
        onChange={(e) => aplicar("planned_week", e.target.value)}
      >
        <option value="">Semana: todas</option>
        {WEEK_OPTIONS.map((w) => (
          <option key={w} value={String(w)}>
            Semana {w}
          </option>
        ))}
      </Select>
    </div>
  );
}
