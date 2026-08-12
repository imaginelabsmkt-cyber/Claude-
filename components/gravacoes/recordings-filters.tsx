"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";
import { STATUS_OPTIONS } from "@/types";
import type { OpcaoCliente } from "@/lib/data/contents";

interface RecordingsFiltersProps {
  clientes: OpcaoCliente[];
  meses: string[];
}

/** Filtros da página de gravações: cliente, semana, mês, status, atrasado. */
export function RecordingsFilters({ clientes, meses }: RecordingsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function aplicar(chave: string, valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (valor) params.set(chave, valor);
    else params.delete(chave);
    router.push(`${pathname}?${params.toString()}`);
  }

  const v = (k: string) => searchParams.get(k) ?? "";

  return (
    <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
      <Select
        aria-label="Cliente"
        value={v("client_id")}
        onChange={(e) => aplicar("client_id", e.target.value)}
      >
        <option value="">Cliente: todos</option>
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Mês"
        value={v("reference_month")}
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
        value={v("status")}
        onChange={(e) => aplicar("status", e.target.value)}
      >
        <option value="">Status: todos</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
    </div>
  );
}
