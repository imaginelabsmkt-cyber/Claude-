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

/** Os recortes que a pessoa pede todo dia, em um clique cada. */
const ATALHOS: { rotulo: string; params: Record<string, string> }[] = [
  { rotulo: "Tudo", params: { situacao: "", tipo: "" } },
  { rotulo: "Em aberto", params: { situacao: "aberto", tipo: "" } },
  { rotulo: "Vencidos", params: { situacao: "vencido", tipo: "" } },
  { rotulo: "Só o que entrou", params: { situacao: "", tipo: "Receita" } },
  { rotulo: "Só o que saiu", params: { situacao: "", tipo: "Despesa" } },
];

/**
 * Filtros da lista de lançamentos.
 *
 * Eram quatro caixas de seleção iguais, e as duas perguntas de todo dia
 * ("o que está em aberto?", "o que já venceu?") precisavam de dois
 * cliques cada uma, numa lista de opções. Viraram atalhos de um clique.
 *
 * Categoria e cliente continuam em caixa de seleção: são listas longas
 * e a pergunta é mais rara.
 *
 * Todo o estado vive na URL, então o recorte é compartilhável e
 * sobrevive à recarga.
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

  const situacaoAtual = searchParams.get("situacao") ?? "";
  const tipoAtual = searchParams.get("tipo") ?? "";
  const ativo = (a: (typeof ATALHOS)[number]) =>
    a.params.situacao === situacaoAtual && a.params.tipo === tipoAtual;

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {ATALHOS.map((a) => (
          <button
            key={a.rotulo}
            type="button"
            onClick={() => aplicar(a.params)}
            aria-pressed={ativo(a)}
            className={
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors " +
              (ativo(a)
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50")
            }
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <form onSubmit={aoBuscar} className="flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Procurar pelo nome..."
            aria-label="Procurar lançamento"
          />
          <Button type="submit" variante="secundaria">
            Ir
          </Button>
        </form>

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
