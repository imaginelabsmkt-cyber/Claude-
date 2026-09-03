"use client";

import { useMemo, useState, type ReactNode } from "react";
import { EditableContentsTable } from "@/components/contents/editable-contents-table";
import { mesEfetivo, hojeISO } from "@/lib/rules/contents";
import { cn } from "@/lib/utils";
import type { Content, Profile } from "@/types";
import type { OpcaoCliente } from "@/lib/data/contents";

const NOMES_MES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

/** "2026-09" => "set/2026". */
function rotuloMes(iso: string): string {
  const [ano, mes] = iso.split("-");
  return `${NOMES_MES[Number(mes) - 1] ?? mes}/${ano}`;
}

/**
 * Conteúdos do cliente divididos por MÊS (usa mesEfetivo, a mesma regra do
 * Dashboard/Conteúdos). Conteúdo ainda não publicado pertence ao mês atual —
 * então o que não foi feito "rola" para o mês seguinte conforme o tempo passa,
 * em vez de sumir. Também dá para ver "Todos".
 */
export function ClientContentsByMonth({
  contents,
  clientes,
  perfis,
  vazioTitulo,
  vazioDescricao,
  acaoVazio,
}: {
  contents: Content[];
  clientes: OpcaoCliente[];
  perfis: Profile[];
  vazioTitulo?: string;
  vazioDescricao?: string;
  acaoVazio?: ReactNode;
}) {
  const mesAtual = hojeISO().slice(0, 7);
  const [mes, setMes] = useState<string>(mesAtual);

  // Meses disponíveis: o atual + os meses efetivos dos conteúdos (publicados
  // caem no mês real; os demais no mês atual). Ordena do mais recente ao antigo.
  const meses = useMemo(() => {
    const set = new Set<string>([mesAtual]);
    for (const c of contents) set.add(mesEfetivo(c));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [contents, mesAtual]);

  const filtrados =
    mes === "todos" ? contents : contents.filter((c) => mesEfetivo(c) === mes);

  const Chip = ({ id, texto }: { id: string; texto: string }) => (
    <button
      type="button"
      onClick={() => setMes(id)}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
        mes === id
          ? "bg-brand-600 text-white"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200",
      )}
    >
      {texto}
    </button>
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {meses.map((m) => (
          <Chip
            key={m}
            id={m}
            texto={m === mesAtual ? `${rotuloMes(m)} (atual)` : rotuloMes(m)}
          />
        ))}
        <Chip id="todos" texto="Todos" />
      </div>
      <EditableContentsTable
        contents={filtrados}
        clientes={clientes}
        perfis={perfis}
        mostrarCliente={false}
        compacto
        vazioTitulo={vazioTitulo ?? "Nenhum conteúdo neste mês"}
        vazioDescricao={
          vazioDescricao ??
          "Nada previsto para este mês. Veja em “Todos” ou troque de mês."
        }
        acaoVazio={acaoVazio}
      />
    </div>
  );
}
