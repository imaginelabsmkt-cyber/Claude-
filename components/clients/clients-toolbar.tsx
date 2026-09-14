"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { FiltroStatusCliente } from "@/lib/data/clients";

/**
 * Barra de ferramentas da listagem de clientes: busca por nome e filtro
 * ativos/inativos. O estado vive na URL (?q= e ?status=), então é
 * compartilhável e sobrevive a recargas.
 */
export function ClientsToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  // Padrão = "ativos" (inativos ficam guardados no filtro).
  const status = (searchParams.get("status") as FiltroStatusCliente) ?? "ativos";

  function aplicar(proximos: { q?: string; status?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (proximos.q !== undefined) {
      if (proximos.q) params.set("q", proximos.q);
      else params.delete("q");
    }
    if (proximos.status !== undefined) {
      // "ativos" é o padrão, então não precisa ficar na URL.
      if (proximos.status && proximos.status !== "ativos") {
        params.set("status", proximos.status);
      } else {
        params.delete("status");
      }
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function aoBuscar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    aplicar({ q: q.trim() });
  }

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <form onSubmit={aoBuscar} className="flex flex-1 gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome..."
          aria-label="Buscar cliente"
        />
        <Button type="submit" variante="secundaria">
          Buscar
        </Button>
      </form>

      <Select
        aria-label="Filtrar por status"
        className="sm:w-48"
        value={status}
        onChange={(e) => aplicar({ status: e.target.value })}
      >
        <option value="ativos">Somente ativos</option>
        <option value="inativos">Inativos (guardados)</option>
        <option value="todos">Todos</option>
      </Select>
    </div>
  );
}
