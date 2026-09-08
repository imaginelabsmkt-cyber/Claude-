"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Client, FinancialCategory } from "@/types";

interface EntriesToolbarProps {
  categorias: FinancialCategory[];
  clientes: Pick<Client, "id" | "name">[];
}

/**
 * Filtros da listagem de lançamentos. Todo o estado vive na URL, então o
 * recorte é compartilhável e sobrevive à recarga (mesma ideia da tela de
 * clientes).
 */
export function EntriesToolbar({ categorias, clientes }: EntriesToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function aplicar(proximos: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [chave, valor] of Object.entries(proximos)) {
      if (valor && valor !== "todos") params.set(chave, valor);
      else params.delete(chave);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function aoBuscar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    aplicar({ q: q.trim() });
  }

  const valor = (chave: string) => searchParams.get(chave) ?? "todos";

  return (
    <div className="mb-4 space-y-3">
      <form onSubmit={aoBuscar} className="flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar na descrição..."
          aria-label="Buscar lançamento"
        />
        <Button type="submit" variante="secundaria">
          Buscar
        </Button>
      </form>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          aria-label="Filtrar por tipo"
          value={valor("tipo")}
          onChange={(e) => aplicar({ tipo: e.target.value })}
        >
          <option value="todos">Todos os tipos</option>
          <option value="Receita">Somente receitas</option>
          <option value="Despesa">Somente despesas</option>
        </Select>

        <Select
          aria-label="Filtrar por situação"
          value={valor("status")}
          onChange={(e) => aplicar({ status: e.target.value })}
        >
          <option value="todos">Todas as situações</option>
          <option value="Pago">Pagos</option>
          <option value="Pendente">Pendentes</option>
        </Select>

        <Select
          aria-label="Filtrar por categoria"
          value={valor("categoria")}
          onChange={(e) => aplicar({ categoria: e.target.value })}
        >
          <option value="todos">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.kind === "Receita" ? "↑" : "↓"} {c.name}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Filtrar por cliente"
          value={valor("cliente")}
          onChange={(e) => aplicar({ cliente: e.target.value })}
        >
          <option value="todos">Todos os clientes</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
