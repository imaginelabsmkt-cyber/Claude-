"use client";

import { useMemo, useState } from "react";
import { toast } from "@/lib/ui/toast";
import type { Demand } from "@/types";

const NOMES_MES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
/** Segunda-feira da semana que contém `d`. */
function inicioSemana(d: Date): Date {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7; // 0 = segunda
  x.setDate(x.getDate() - dow);
  x.setHours(0, 0, 0, 0);
  return x;
}
function fmtDia(isoStr: string): string {
  const [a, m, dd] = isoStr.split("-").map(Number);
  return `${String(dd).padStart(2, "0")}/${NOMES_MES[m - 1] ?? m}`;
}

/**
 * Relatório semanal por cliente: o que foi CONCLUÍDO (demandas Feitas) na
 * semana, agrupado por área. Navega entre semanas e copia um resumo pronto
 * para enviar ao cliente.
 */
export function ClientWeeklyReport({
  clienteNome,
  feitas,
}: {
  clienteNome: string;
  /** Demandas concluídas (Feita), inclusive arquivadas, data em updated_at. */
  feitas: Demand[];
}) {
  const [offset, setOffset] = useState(0); // 0 = semana atual, -1 = anterior…

  const { ini, fim, doPeriodo } = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + offset * 7);
    const ini = inicioSemana(base);
    const fim = new Date(ini);
    fim.setDate(fim.getDate() + 6);
    const iniISO = iso(ini);
    const fimISO = iso(fim);
    const doPeriodo = feitas.filter((d) => {
      const dia = (d.updated_at ?? "").slice(0, 10);
      return dia >= iniISO && dia <= fimISO;
    });
    return { ini: iniISO, fim: fimISO, doPeriodo };
  }, [offset, feitas]);

  // Agrupa por área.
  const grupos = useMemo(() => {
    const mapa = new Map<string, Demand[]>();
    for (const d of doPeriodo) {
      const k = d.category?.trim() || "Geral";
      mapa.set(k, [...(mapa.get(k) ?? []), d]);
    }
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [doPeriodo]);

  const copiar = () => {
    const linhas = [
      `Relatório, ${clienteNome}`,
      `Semana de ${fmtDia(ini)} a ${fmtDia(fim)}`,
      "",
    ];
    if (doPeriodo.length === 0) {
      linhas.push("Nenhuma entrega concluída nesta semana.");
    } else {
      for (const [area, itens] of grupos) {
        linhas.push(`• ${area}`);
        for (const d of itens) linhas.push(`   - ${d.title}`);
      }
    }
    navigator.clipboard
      .writeText(linhas.join("\n"))
      .then(() => toast.sucesso("Relatório copiado!"))
      .catch(() => toast.erro("Não foi possível copiar."));
  };

  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">
            ✅ Feito na semana
          </span>
          <button
            type="button"
            onClick={() => setOffset((o) => o - 1)}
            aria-label="Semana anterior"
            className="rounded-md border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            ←
          </button>
          <span className="text-xs font-medium text-gray-600">
            {fmtDia(ini)} a {fmtDia(fim)}
            {offset === 0 ? " (atual)" : ""}
          </span>
          <button
            type="button"
            onClick={() => setOffset((o) => o + 1)}
            aria-label="Próxima semana"
            className="rounded-md border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            →
          </button>
        </div>
        <button
          type="button"
          onClick={copiar}
          className="rounded-md bg-brand-600 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-700"
        >
          Copiar relatório
        </button>
      </div>

      {doPeriodo.length === 0 ? (
        <p className="text-xs text-gray-400">
          Nada concluído nesta semana ainda. O que você marcar como “Feita”
          aparece aqui.
        </p>
      ) : (
        <div className="space-y-2">
          {grupos.map(([area, itens]) => (
            <div key={area}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {area}
              </p>
              <ul className="mt-0.5 space-y-0.5">
                {itens.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-600">✓</span>
                    <span>{d.title}</span>
                    <span className="text-[11px] text-gray-400">
                      {fmtDia((d.updated_at ?? "").slice(0, 10))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
