"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  FORMAT_OPTIONS,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  WEEK_OPTIONS,
} from "@/types";
import type { OpcaoCliente } from "@/lib/data/contents";

interface ContentsToolbarProps {
  clientes: OpcaoCliente[];
  meses: string[];
}

/**
 * Filtros e busca da listagem de conteúdos. Estado na URL (compartilhável).
 * Filtros: cliente, status, prioridade, formato, mês, semana. Busca: título.
 */
export function ContentsToolbar({ clientes, meses }: ContentsToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function aplicar(mudancas: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor) params.set(chave, valor);
      else params.delete(chave);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function aoBuscar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    aplicar({ q: q.trim() });
  }

  const valor = (chave: string) => searchParams.get(chave) ?? "";

  return (
    <div className="mb-4 space-y-3">
      <form onSubmit={aoBuscar} className="flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por título..."
          aria-label="Buscar conteúdo"
        />
        <Button type="submit" variante="secundaria">
          Buscar
        </Button>
      </form>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Select
          aria-label="Cliente"
          value={valor("client_id")}
          onChange={(e) => aplicar({ client_id: e.target.value })}
        >
          <option value="">Cliente: todos</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Status"
          value={valor("status")}
          onChange={(e) => aplicar({ status: e.target.value })}
        >
          <option value="">Status: todos</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Prioridade"
          value={valor("priority")}
          onChange={(e) => aplicar({ priority: e.target.value })}
        >
          <option value="">Prioridade: todas</option>
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Formato"
          value={valor("format")}
          onChange={(e) => aplicar({ format: e.target.value })}
        >
          <option value="">Formato: todos</option>
          {FORMAT_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Mês"
          value={valor("reference_month")}
          onChange={(e) => aplicar({ reference_month: e.target.value })}
        >
          <option value="">Mês: todos</option>
          {meses.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Semana"
          value={valor("planned_week")}
          onChange={(e) => aplicar({ planned_week: e.target.value })}
        >
          <option value="">Semana: todas</option>
          {WEEK_OPTIONS.map((w) => (
            <option key={w} value={String(w)}>
              Semana {w}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
